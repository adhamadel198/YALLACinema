import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.ts';
import { findSeatGroups, isSeat } from '../src/domain/seats.ts';

// Free choice of seats (BRD 7.1, 7.2): the customer may hold any free seats on the map, together or
// scattered, up to 10 per booking, but never seats that are not on that showtime's map.

type App = Awaited<ReturnType<typeof buildApp>>;

const hold = (app: App, showtimeId: string, seats: string[], client: string) =>
  app.inject({ method: 'POST', url: '/v1/holds', payload: { showtimeId, seats }, headers: { 'x-client-id': client } });

/** The showtime of The Last Light with the most free seats, its map and its free seats in map order. */
async function roomyShowtime(app: App) {
  const { results } = (await app.inject('/v1/movies/the-last-light/showtimes?count=1')).json() as { results: { showtimeId: string }[] };
  const maps = await Promise.all(results.map(async (r) => {
    const map = (await app.inject(`/v1/showtimes/${r.showtimeId}/seats?count=1`)).json();
    const taken = new Set<string>(map.unavailable);
    const free: string[] = [];
    for (let row = 0; row < map.rows; row++)
      for (let col = 1; col <= map.cols; col++) {
        const id = String.fromCharCode(65 + row) + col;
        if (!taken.has(id)) free.push(id);
      }
    return { showtimeId: r.showtimeId, map, free };
  }));
  return maps.sort((a, b) => b.free.length - a.free.length)[0];
}

test('a seat id must name a seat on the map, in its exact form', () => {
  const map = { rows: 8, cols: 12, unavailable: [] };
  assert.ok(isSeat(map, 'A1') && isSeat(map, 'H12') && isSeat(map, 'D7'));
  for (const id of ['A0', 'A01', 'A13', 'I1', 'Z9', 'a1', 'A', '1', '', 'AA1', 'A1 '])
    assert.equal(isSeat(map, id), false, id);
});

test('seats either side of an aisle are not next to each other', () => {
  // Row A: A1 A2 | A3 A4 A5 A6
  const hall = { rows: 1, cols: 6, unavailable: [], aisles: [2] };
  assert.deepEqual(findSeatGroups(hall, 2, 'connected').map((g) => g.seats), [['A1', 'A2'], ['A3', 'A4'], ['A4', 'A5'], ['A5', 'A6']]);
  assert.deepEqual(findSeatGroups(hall, 6, 'connected'), []);
  const [split] = findSeatGroups(hall, 6, 'separated');
  assert.deepEqual(split.pattern, [4, 2]);
});

test('the seat map lists the aisles of halls that have them', async () => {
  const app = await buildApp();
  const showtimes = (cinemaId: string) => app.inject(`/v1/movies/the-last-light/showtimes?count=2&arrangement=connected&cinemaId=${cinemaId}`).then((r) => r.json().results);
  const [galaxy] = await showtimes('galaxy-maadi');
  const map = (await app.inject(`/v1/showtimes/${galaxy.showtimeId}/seats?count=2&arrangement=connected`)).json();
  assert.deepEqual(map.aisles, [2, 10]);
  // 2 | 8 | 2: no connected pair straddles a walkway.
  const side = (seat: string) => { const n = Number(seat.slice(1)); return n <= 2 ? 0 : n <= 10 ? 1 : 2; };
  assert.ok(map.groups.length > 0);
  for (const g of map.groups) assert.equal(side(g.seats[0]), side(g.seats[1]), g.seats.join());

  const [vox] = await showtimes('vox-moe');
  assert.deepEqual((await app.inject(`/v1/showtimes/${vox.showtimeId}/seats`)).json().aisles, []);
  await app.close();
});

test('holds refuse seats that are not on the showtime’s seat map, and hold nothing', async () => {
  const app = await buildApp();
  const { showtimeId, map, free } = await roomyShowtime(app);
  assert.equal(map.rows, 8);
  assert.equal(map.cols, 12);
  for (const bad of ['A13', 'I1', 'A0', 'A01', 'Z9']) {
    const res = await hold(app, showtimeId, [free[0], bad], 'customer-one');
    assert.equal(res.statusCode, 400, bad);
    assert.deepEqual(res.json().unknown, [bad]);
  }
  // The real seat sent alongside was not held.
  assert.equal((await hold(app, showtimeId, [free[0]], 'customer-two')).statusCode, 201);
  await app.close();
});

test('a customer can hold any free seats, scattered across the hall', async () => {
  const app = await buildApp();
  const { showtimeId, free } = await roomyShowtime(app);
  const scattered = [free[0], free.at(-1)!];
  assert.notEqual(scattered[0][0], scattered[1][0], 'seats in different rows');
  const { price } = (await app.inject(`/v1/showtimes/${showtimeId}`)).json();

  const res = await hold(app, showtimeId, scattered, 'customer-one');
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.json().seats, scattered);
  assert.deepEqual(res.json().price, { tickets: price * 2, fees: 10, total: price * 2 + 10 });
  assert.deepEqual((await app.inject(`/v1/holds/${res.json().id}`)).json().seats, scattered);

  const after = (await app.inject(`/v1/showtimes/${showtimeId}/seats`)).json();
  assert.ok(scattered.every((s) => after.unavailable.includes(s)));
  await app.close();
});

test('a selection with one seat someone else holds is refused as a whole', async () => {
  const app = await buildApp();
  const { showtimeId, free } = await roomyShowtime(app);
  const [a, b, c] = [free[0], free[5], free.at(-1)!];
  assert.equal((await hold(app, showtimeId, [a, b], 'customer-one')).statusCode, 201);
  const clash = await hold(app, showtimeId, [c, b], 'customer-two');
  assert.equal(clash.statusCode, 409);
  assert.deepEqual(clash.json().unavailable, [b]);
  assert.equal((await hold(app, showtimeId, [c], 'customer-three')).statusCode, 201);
  await app.close();
});

test('a seat the cinema has already sold cannot be picked into a selection', async () => {
  const app = await buildApp();
  const { showtimeId, map, free } = await roomyShowtime(app);
  const sold = map.unavailable[0];
  assert.ok(sold, 'the seed marks some seats as sold at the cinema');
  const res = await hold(app, showtimeId, [free[0], sold], 'customer-one');
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.json().unavailable, [sold]);
  assert.equal((await hold(app, showtimeId, [free[0]], 'customer-two')).statusCode, 201);
  await app.close();
});

test('free choice keeps the 10-seat cap', async () => {
  const app = await buildApp();
  const { showtimeId, free } = await roomyShowtime(app);
  assert.ok(free.length >= 21, 'enough free seats to test the cap');
  // Every other free seat, so the ten are spread out rather than one block.
  const spread = free.filter((_, i) => i % 2 === 0);
  assert.equal((await hold(app, showtimeId, spread.slice(0, 11), 'big-group')).statusCode, 400);
  assert.equal((await hold(app, showtimeId, [free[0], free[0]], 'big-group')).statusCode, 400);
  assert.equal((await hold(app, showtimeId, [], 'big-group')).statusCode, 400);
  const ten = await hold(app, showtimeId, spread.slice(0, 10), 'big-group');
  assert.equal(ten.statusCode, 201);
  assert.equal(ten.json().seats.length, 10);
  await app.close();
});
