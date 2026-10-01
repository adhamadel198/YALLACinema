// Checks a bundled Vercel function answers: node scripts/smoke-vercel.mjs <function dir>
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';

const { default: handler } = await import(join(resolve(process.argv[2]), 'index.mjs'));
const server = createServer(handler).listen(0);
const base = `http://localhost:${server.address().port}`;
assert.equal((await fetch(`${base}/api?__path=health`)).status, 200);
const movies = await (await fetch(`${base}/api?__path=v1/movies`)).json();
assert.ok(movies.length > 0);
server.close();
console.log('Vercel function answers');
process.exit(0);
