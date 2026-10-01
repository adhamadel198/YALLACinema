import { test } from 'node:test';
import assert from 'node:assert/strict';
import { originalUrl } from '../src/vercel.ts';

test('the Vercel entry restores the path Vercel rewrote', () => {
  assert.equal(originalUrl('/api?__path=v1%2Fmovies%2Fthe-last-light%2Fshowtimes&count=2'), '/v1/movies/the-last-light/showtimes?count=2');
  assert.equal(originalUrl('/v1/movies?genre=Drama&__path=v1/movies'), '/v1/movies?genre=Drama');
  assert.equal(originalUrl('/api?__path=health'), '/health');
  assert.equal(originalUrl('/health'), '/health');
});
