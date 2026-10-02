import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer, type AddressInfo, type Socket } from 'node:net';
import { originalUrl } from '../src/vercel.ts';
import { createDb } from '../src/db/index.ts';

test('the Vercel entry restores the path Vercel rewrote', () => {
  assert.equal(originalUrl('/api?__path=v1%2Fmovies%2Fthe-last-light%2Fshowtimes&count=2'), '/v1/movies/the-last-light/showtimes?count=2');
  assert.equal(originalUrl('/v1/movies?genre=Drama&__path=v1/movies'), '/v1/movies?genre=Drama');
  assert.equal(originalUrl('/api?__path=health'), '/health');
  assert.equal(originalUrl('/health'), '/health');
});

test('a start against a database that never answers fails within seconds, so the next request can retry', { timeout: 30_000 }, async () => {
  // Accepts connections and never says a word, like a database behind a firewall that drops packets.
  const sockets = new Set<Socket>();
  const silent = createServer((socket) => { sockets.add(socket); }).listen(0, '127.0.0.1');
  await once(silent, 'listening');
  // Without a connection timeout the start would wait for ever; hang up after 10 seconds so the test ends regardless.
  const hangUp = setTimeout(() => { for (const socket of sockets) socket.destroy(); }, 10_000);
  try {
    await assert.rejects(createDb(`postgres://yalla@127.0.0.1:${(silent.address() as AddressInfo).port}/yalla`), /connection timeout/);
  } finally {
    clearTimeout(hangUp);
    for (const socket of sockets) socket.destroy();
    silent.close();
  }
});
