import { mkdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export interface Db extends Queryable {
  /** Runs a multi-statement script without parameters (the schema). */
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

/** Postgres error code for a unique or primary key violation. */
export const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === '23505';

/**
 * Postgres when DATABASE_URL is set. Otherwise PGlite, an embedded Postgres, so development and
 * tests need no database server: data persists in PGLITE_DIR, or stays in memory when it is "memory://".
 */
export async function createDb(url = process.env.DATABASE_URL, pgliteDir = process.env.PGLITE_DIR ?? './.data/pglite'): Promise<Db> {
  const db = url ? postgres(url) : await pglite(pgliteDir);
  await db.exec(schema);
  return db;
}

function postgres(url: string): Db {
  const pool = new pg.Pool({ connectionString: url });
  return {
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
    query: (sql, params) => lite.query(sql, params) as never,
    exec: async (sql) => { await lite.exec(sql); },
    transaction: (fn) => lite.transaction((tx) => fn({ query: (sql, params) => tx.query(sql, params) as never })),
    close: () => lite.close(),
  };
}
