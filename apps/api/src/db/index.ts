import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
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

/** Every file in schema/, in name order. Each statement must be safe to run again (IF NOT EXISTS). */
const schemaDir = new URL('./schema/', import.meta.url);
const schema = readdirSync(schemaDir).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => readFileSync(new URL(f, schemaDir), 'utf8')).join('\n');

/** Postgres error code for a unique or primary key violation. */
export const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === '23505';

/**
 * Postgres when DATABASE_URL is set. Otherwise PGlite, an embedded Postgres, so development and
 * tests need no database server: data persists in PGLITE_DIR, or stays in memory when it is "memory://".
 */
export async function createDb(url = process.env.DATABASE_URL, pgliteDir = process.env.PGLITE_DIR ?? './.data/pglite'): Promise<Db> {
  const db = url ? postgres(url) : await pglite(pgliteDir);
  // Several API instances can start at once (e.g. on Vercel); the lock makes them apply the schema one at a time.
  await db.exec(db.kind === 'postgres' ? `BEGIN; SELECT pg_advisory_xact_lock(727274);\n${schema}\nCOMMIT;` : schema);
  return db;
}

function postgres(url: string): Db {
  const pool = new pg.Pool({ connectionString: url });
  return {
    kind: 'postgres',
    query: (sql, params) => pool.query(sql, params as unknown[]) as never,
    exec: async (sql) => { await pool.query(sql); },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn({ query: (sql, params) => client.query(sql, params as unknown[]) as never });
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function pglite(dataDir: string): Promise<Db> {
  if (!dataDir.includes('://')) mkdirSync(dataDir, { recursive: true });
  const lite = await PGlite.create(dataDir);
  return {
    kind: 'pglite',
    query: (sql, params) => lite.query(sql, params) as never,
    exec: async (sql) => { await lite.exec(sql); },
    transaction: (fn) => lite.transaction((tx) => fn({ query: (sql, params) => tx.query(sql, params) as never })),
    close: () => lite.close(),
  };
}
