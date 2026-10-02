import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import pg from 'pg';

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export interface Db extends Queryable {
  /** 'pglite' is the embedded database used in development, tests and previews; 'postgres' is a real server. */
  kind: 'postgres' | 'pglite';
  /** Runs a multi-statement script without parameters (the schema). */
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export type SchemaFile = { name: string; sql: string };

/** Every file in schema/, in name order. Each statement must be safe to run again (IF NOT EXISTS). */
const schemaDir = new URL('./schema/', import.meta.url);
export const schemaFiles: SchemaFile[] = readdirSync(schemaDir).filter((f) => f.endsWith('.sql')).sort()
  .map((name) => ({ name, sql: readFileSync(new URL(name, schemaDir), 'utf8') }));

/** Postgres error code for a unique or primary key violation. */
export const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === '23505';
const isUndefinedTable = (e: unknown) => (e as { code?: string })?.code === '42P01';

/** A transaction for schema changes; its handle also runs scripts of several statements. */
type Migrate = (fn: (tx: Queryable & Pick<Db, 'exec'>) => Promise<void>) => Promise<void>;

/**
 * Postgres when DATABASE_URL is set. Otherwise PGlite, an embedded Postgres, so development and
 * tests need no database server: data persists in PGLITE_DIR, or stays in memory when it is "memory://".
 * `schema` is for tests; the API always applies the files in schema/.
 */
export async function createDb(url = process.env.DATABASE_URL, pgliteDir = process.env.PGLITE_DIR ?? './.data/pglite', schema = schemaFiles): Promise<Db> {
  const { db, migrate } = url ? postgres(url) : await pglite(pgliteDir);
  try {
    await applySchema(db, migrate, schema);
  } catch (e) {
    await db.close().catch(() => {}); // The Vercel entry starts again, with new connections, on the next request.
    throw e;
  }
  return db;
}

/**
 * Applies the schema files unless this database already has exactly these files applied: each version of them is
 * recorded by its hash in schema_versions, so a usual start reads one row and takes no locks on the tables.
 * Otherwise every file runs, in name order, and the hash is recorded, in one transaction. A file added or
 * changed later therefore runs at the next start (along with the others, which is why they must be safe to rerun).
 */
async function applySchema(db: Db, migrate: Migrate, files: SchemaFile[]) {
  const hash = createHash('sha256');
  for (const f of files) hash.update(`${f.name}\0${f.sql}\0`);
  const version = hash.digest('hex');
  if (await applied(db, version)) return;
  await migrate(async (tx) => {
    await tx.exec('CREATE TABLE IF NOT EXISTS schema_versions (hash text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    // Another instance may have applied the same files while this one waited for its turn.
    if (await applied(tx, version)) return;
    await tx.exec(files.map((f) => f.sql).join('\n'));
    await tx.query('INSERT INTO schema_versions (hash) VALUES ($1) ON CONFLICT DO NOTHING', [version]);
  });
}

async function applied(q: Queryable, version: string) {
  try {
    return (await q.query('SELECT 1 FROM schema_versions WHERE hash = $1', [version])).rows.length > 0;
  } catch (e) {
    if (isUndefinedTable(e)) return false; // A new database.
    throw e;
  }
}

function postgres(url: string): { db: Db; migrate: Migrate } {
  // Few connections per instance, since serverless platforms run many instances against one server. A start
  // against a database that can't be reached fails after 5 seconds instead of hanging (see vercel.ts).
  const pool = new pg.Pool({ connectionString: url, max: 3, connectionTimeoutMillis: 5000 });
  const handle = (client: pg.PoolClient) => ({
    query: (sql: string, params?: unknown[]) => client.query(sql, params) as never,
    exec: async (sql: string) => { await client.query(sql); },
  });
  async function inTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  const db: Db = {
    kind: 'postgres',
    query: (sql, params) => pool.query(sql, params as unknown[]) as never,
    exec: async (sql) => { await pool.query(sql); },
    transaction: (fn) => inTransaction((client) => fn(handle(client))),
    close: () => pool.end(),
  };
  const migrate: Migrate = (fn) => inTransaction(async (client) => {
    // Schema changes lock whole tables. Waiting for a lock fails after a few seconds, so a start fails fast
    // (and is retried) rather than queue behind purchases in progress and make new ones queue behind it.
    await client.query(`SET LOCAL lock_timeout = '5s'`);
    // Several API instances can start at once (e.g. on Vercel); they apply the schema one at a time.
    await client.query('SELECT pg_advisory_xact_lock(727274)');
    await fn(handle(client));
  });
  return { db, migrate };
}

async function pglite(dataDir: string): Promise<{ db: Db; migrate: Migrate }> {
  if (!dataDir.includes('://')) mkdirSync(dataDir, { recursive: true });
  const lite = await PGlite.create(dataDir);
  const handle = (tx: Transaction) => ({
    query: (sql: string, params?: unknown[]) => tx.query(sql, params) as never,
    exec: async (sql: string) => { await tx.exec(sql); },
  });
  const db: Db = {
    kind: 'pglite',
    query: (sql, params) => lite.query(sql, params) as never,
    exec: async (sql) => { await lite.exec(sql); },
    transaction: (fn) => lite.transaction((tx) => fn(handle(tx))),
    close: () => lite.close(),
  };
  // Only this process uses the embedded database, so no lock is needed.
  return { db, migrate: (fn) => lite.transaction((tx) => fn(handle(tx))) };
}
