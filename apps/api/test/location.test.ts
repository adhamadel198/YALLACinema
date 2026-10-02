import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import Fastify from 'fastify';
import { buildApp } from '../src/app.ts';
import { createDb } from '../src/db/index.ts';
import { Store } from '../src/data/store.ts';
import { catalogRoutes } from '../src/routes/catalog.ts';

// "Use my location" on the distance sort (BRD 7.1): the app sends the device's lat/lon.

type Result = { showtimeId: string; startsAt: string; distanceKm: number | null; cinema: { id: string } };
const search = async (app: Awaited<ReturnType<typeof buildApp>>, query: string) => {
  const res = await app.inject(`/v1/movies/the-last-light/showtimes?count=1&arrangement=either&${query}`);
  return { status: res.statusCode, results: (res.json().results ?? []) as Result[] };
};

/** Each cinema once, in the order it first appears. */
const cinemaOrder = (results: Result[]) => [...new Set(results.map((r) => r.cinema.id))];

test('sorting by device location puts the nearest cinema first and returns each distance in km', async () => {
  const app = await buildApp();
  // Maadi, a few hundred metres from Galaxy Maadi.
  const { status, results } = await search(app, 'sort=distance&lat=29.962&lon=31.25');
  assert.equal(status, 200);
  assert.deepEqual(cinemaOrder(results), ['galaxy-maadi', 'reel-cfc', 'vox-moe']);
  const km = Object.fromEntries(results.map((r) => [r.cinema.id, r.distanceKm]));
  assert.equal(km['galaxy-maadi'], 1);
  assert.ok(km['reel-cfc']! > 15 && km['reel-cfc']! < 20, `Reel ${km['reel-cfc']}`);
  assert.ok(km['vox-moe']! > 20 && km['vox-moe']! < 25, `VOX ${km['vox-moe']}`);
  // Distances never go down the list, and showtimes at the same cinema stay in time order.
  for (let i = 1; i < results.length; i++) {
    const [a, b] = [results[i - 1], results[i]];
    assert.ok(a.distanceKm! <= b.distanceKm!);
    if (a.cinema.id === b.cinema.id) assert.ok(a.startsAt <= b.startsAt);
  }
});

test('a different location gives a different order', async () => {
  const app = await buildApp();
  // Sheikh Zayed / 6th of October side of Giza.
  const { results } = await search(app, 'sort=distance&lat=30.01&lon=30.97');
  assert.deepEqual(cinemaOrder(results), ['vox-moe', 'galaxy-maadi', 'reel-cfc']);
});

test('device location wins over a picked area', async () => {
  const app = await buildApp();
  const { results } = await search(app, 'sort=distance&nearArea=New%20Cairo&lat=29.962&lon=31.25');
  assert.equal(results[0].cinema.id, 'galaxy-maadi');
});

test('with no location or area, distance sort falls back to soonest and shows no distances', async () => {
  const app = await buildApp();
  const { results } = await search(app, 'sort=distance');
  assert.ok(results.length > 0);
  assert.ok(results.every((r) => r.distanceKm === null));
  assert.deepEqual(results.map((r) => r.startsAt), results.map((r) => r.startsAt).sort());
});

test('coordinates must be a real lat/lon pair', async () => {
  const app = await buildApp();
  for (const bad of ['lat=29.96', 'lon=31.25', 'lat=95&lon=31.25', 'lat=29.96&lon=-181', 'lat=north&lon=31.25']) {
    assert.equal((await search(app, `sort=distance&${bad}`)).status, 400, bad);
  }
});

test('request logs do not record the customer\'s coordinates', async () => {
  const lines: string[] = [];
  const stream = new Writable({ write(chunk, _enc, done) { lines.push(String(chunk)); done(); } });
  const db = await createDb(undefined, 'memory://');
  const app = Fastify({ logger: { level: 'info', stream } });
  app.addHook('onClose', () => db.close());
  await app.register(catalogRoutes, { store: new Store(db) });
  const res = await app.inject('/v1/movies/the-last-light/showtimes?sort=distance&lat=29.9617&lon=31.2534&count=2');
  assert.equal(res.statusCode, 200);
  await app.close();
  const logged = lines.join('');
  assert.match(logged, /incoming request/);
  assert.match(logged, /showtimes\?sort=distance&lat=~&lon=~&count=2/);
  assert.doesNotMatch(logged, /29\.9617|31\.2534/);
});
