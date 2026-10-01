import { parseArgs } from 'node:util';
import { Accounts } from './data/accounts.ts';
import { createOperator } from './data/operator.ts';
import { cinemas } from './data/seed.ts';
import { createDb } from './db/index.ts';

/**
 * Creates a cinema staff account for the operator portal against a real Postgres database:
 *
 *   DATABASE_URL=postgres://… npm run create-operator -- --cinema vox-moe --email manager@vox.example --name "Duty manager"
 *
 * A strong password is generated and printed once; set OPERATOR_PASSWORD (12+ characters) to choose it instead.
 * The embedded development database seeds demo staff accounts by itself, so this needs DATABASE_URL.
 */
const usage = 'Usage: DATABASE_URL=postgres://… npm run create-operator -- --cinema <id> --email <email> --name "<name>" [--mobile "+20 …"]';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error(`Set DATABASE_URL to the Postgres database the API uses.\n${usage}`);
  process.exit(1);
}

let values: { cinema?: string; email?: string; name?: string; mobile?: string };
try {
  ({ values } = parseArgs({ options: { cinema: { type: 'string' }, email: { type: 'string' }, name: { type: 'string' }, mobile: { type: 'string' } } }));
} catch (e) {
  console.error(`${(e as Error).message}\n${usage}`);
  process.exit(1);
}

const db = await createDb(url);
try {
  const { account, cinema, generatedPassword } = await createOperator(new Accounts(db), cinemas, { ...values, password: process.env.OPERATOR_PASSWORD });
  console.log(`Created staff account ${account.email} for ${cinema.name}.`);
  if (generatedPassword) console.log(`Password (shown once, share it securely): ${generatedPassword}`);
} catch (e) {
  console.error(`${(e as Error).message}\n${usage}`);
  process.exitCode = 1;
} finally {
  await db.close();
}
