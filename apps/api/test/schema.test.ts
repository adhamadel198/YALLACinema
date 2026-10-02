import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDb, schemaFiles, type SchemaFile } from '../src/db/index.ts';

// Each run of this file leaves a row, standing in for schema changes that lock tables.
const probe: SchemaFile = { name: '900_probe.sql', sql: 'CREATE TABLE IF NOT EXISTS probe (n serial PRIMARY KEY); INSERT INTO probe DEFAULT VALUES;' };

test('the schema runs at start only when its files changed since the last run', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'yalla-schema-'));
  /** Starts on the same database with these files, as a restart after a deploy would; returns how often the probe ran. */
  const start = async (files: SchemaFile[]) => {
    const db = await createDb(undefined, dir, files);
    try {
      return (await db.query<{ n: number }>('SELECT count(*)::int AS n FROM probe')).rows[0].n;
    } finally {
      await db.close();
    }
  };
  try {
    assert.equal(await start([...schemaFiles, probe]), 1);
    // The same files again: nothing runs.
    assert.equal(await start([...schemaFiles, probe]), 1);
    assert.equal(await start([...schemaFiles, probe]), 1);

    // A file added later runs at the next start, with the others (they are safe to run again), and then not again.
    const added: SchemaFile = { name: '901_added.sql', sql: 'CREATE TABLE IF NOT EXISTS added (id int);' };
    assert.equal(await start([...schemaFiles, probe, added]), 2);
    assert.equal(await start([...schemaFiles, probe, added]), 2);
    // So does a file that changed.
    assert.equal(await start([...schemaFiles, { ...probe, sql: `${probe.sql}\n-- changed` }, added]), 3);

    // A file that fails leaves nothing behind and fails every start until it is fixed.
    const broken: SchemaFile = { name: '902_broken.sql', sql: 'CREATE TABLE IF NOT EXISTS half_done (id int); SELECT * FROM no_such_table;' };
    await assert.rejects(start([...schemaFiles, probe, added, broken]), /no_such_table/);
    await assert.rejects(start([...schemaFiles, probe, added, broken]), /no_such_table/);
    const fixed = { ...broken, sql: 'CREATE TABLE IF NOT EXISTS half_done (id int);' };
    assert.equal(await start([...schemaFiles, probe, added, fixed]), 4);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
