import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../src/app.ts';
import { createDb } from '../src/db/index.ts';

test('movie discovery lists the seed catalogue', async () => {
  const app = await buildApp();
  const res = await app.inject('/v1/movies');
  assert.equal(res.statusCode, 200);
  const movies = res.json();
  assert.equal(movies.length, 5);
  assert.equal(movies[0].title, 'The Last Light');
  assert.ok(movies[0].showtimeCount > 0);
});

test('showtime search returns only showtimes that fit the request, sorted by distance', async () => {
  const app = await buildApp();
  const res = await app.inject('/v1/movies/the-last-light/showtimes?count=2&arrangement=connected&sort=distance&nearArea=Maadi');
  const { results } = res.json();
  assert.ok(results.length > 0);
  assert.ok(results.every((r: any) => r.matches.connected > 0));
  assert.equal(results[0].cinema.area, 'Maadi');
  // Ten seats side by side fit fewer showtimes than two: none is offered as a near match.
  const ten = (await app.inject('/v1/movies/the-last-light/showtimes?count=10&arrangement=connected')).json().results;
  const two = (await app.inject('/v1/movies/the-last-light/showtimes?count=2&arrangement=connected')).json().results;
  assert.ok(ten.length < two.length);
  for (const r of ten) {
    const map = (await app.inject(`/v1/showtimes/${r.showtimeId}/seats?count=10&arrangement=connected`)).json();
    assert.ok(map.groups.length > 0 && map.groups.every((g: { seats: string[] }) => g.seats.length === 10));
  }
});

const as = (client: string) => ({ 'x-client-id': client });

async function bestTwo(app: Awaited<ReturnType<typeof buildApp>>) {
  const { results } = (await app.inject('/v1/movies/the-last-light/showtimes?count=2&arrangement=connected')).json();
  const seats = (await app.inject(`/v1/showtimes/${results[0].showtimeId}/seats?count=2&arrangement=connected`)).json();
  return { showtimeId: results[0].showtimeId as string, seats: seats.best.seats as string[] };
}

test('a hold blocks the same seats for the next customer', async () => {
  const app = await buildApp();
  const payload = await bestTwo(app);
  const first = await app.inject({ method: 'POST', url: '/v1/holds', payload, headers: as('customer-one') });
  assert.equal(first.statusCode, 201);
  assert.equal(first.json().price.fees, 10);
  const second = await app.inject({ method: 'POST', url: '/v1/holds', payload, headers: as('customer-two') });
  assert.equal(second.statusCode, 409);
  assert.deepEqual(second.json().unavailable.sort(), [...payload.seats].sort());
  assert.equal((await app.inject({ method: 'DELETE', url: `/v1/holds/${first.json().id}` })).statusCode, 204);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/holds', payload, headers: as('customer-two') })).statusCode, 201);
});

test('a customer has one hold at a time: a new hold releases their previous seats', async () => {
  const app = await buildApp();
  const payload = await bestTwo(app);
  const first = (await app.inject({ method: 'POST', url: '/v1/holds', payload, headers: as('customer-one') })).json();
  const other = (await app.inject(`/v1/showtimes/${payload.showtimeId}/seats?count=1&arrangement=connected`)).json()
    .groups.find((g: { seats: string[] }) => !payload.seats.includes(g.seats[0]));
  const second = await app.inject({ method: 'POST', url: '/v1/holds', payload: { showtimeId: payload.showtimeId, seats: other.seats }, headers: as('customer-one') });
  assert.equal(second.statusCode, 201);
  assert.equal((await app.inject(`/v1/holds/${first.id}`)).statusCode, 410);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/holds', payload, headers: as('customer-two') })).statusCode, 201);
});

test('holds expire after 10 minutes', async () => {
  let now = Date.now();
  const app = await buildApp({ clock: () => now });
  const payload = await bestTwo(app);
  const hold = (await app.inject({ method: 'POST', url: '/v1/holds', payload, headers: as('customer-one') })).json();
  now += 10 * 60 * 1000 + 1;
  assert.equal((await app.inject(`/v1/holds/${hold.id}`)).statusCode, 410);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/holds', payload, headers: as('customer-two') })).statusCode, 201);
});

test('holding seats is rate limited per customer', async () => {
  const app = await buildApp();
  const payload = await bestTwo(app);
  const codes = [];
  for (let i = 0; i < 31; i++) codes.push((await app.inject({ method: 'POST', url: '/v1/holds', payload, headers: as('busy-customer') })).statusCode);
  assert.equal(codes.at(-1), 429);
  assert.ok(codes.slice(0, 30).every((c) => c === 201));
});

test('bookings survive a restart', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'yalla-db-'));
  try {
    let app = await buildApp({ db: await createDb(undefined, dir) });
    const { hold, seats, showtimeId } = await holdTwoSeats(app);
    const booking = (await app.inject({ method: 'POST', url: '/v1/bookings', payload: { holdId: hold.id, guest, paymentMethod: 'card', acceptPolicy: true } })).json();
    await app.close();

    app = await buildApp({ db: await createDb(undefined, dir) });
    const again = await app.inject(`/v1/bookings/${booking.id}`);
    assert.equal(again.statusCode, 200);
    assert.equal(again.json().reference, booking.reference);
    const map = (await app.inject(`/v1/showtimes/${showtimeId}/seats`)).json();
    assert.ok(seats.every((s) => map.unavailable.includes(s)));
    await app.close();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

async function holdTwoSeats(app: Awaited<ReturnType<typeof buildApp>>) {
  const { results } = (await app.inject('/v1/movies/the-last-light/showtimes?count=2&arrangement=connected')).json();
  const showtimeId = results[0].showtimeId;
  const { best } = (await app.inject(`/v1/showtimes/${showtimeId}/seats?count=2&arrangement=connected`)).json();
  const hold = (await app.inject({ method: 'POST', url: '/v1/holds', payload: { showtimeId, seats: best.seats } })).json();
  return { showtimeId, seats: best.seats as string[], hold };
}

const guest = { name: 'Mona Adel', email: 'mona@example.com', mobile: '+20 100 123 4567' };

test('paying for a hold issues one ticket per seat and sells the seats', async () => {
  const app = await buildApp();
  const { showtimeId, seats, hold } = await holdTwoSeats(app);
  const checkout = (await app.inject(`/v1/holds/${hold.id}`)).json();
  assert.ok(checkout.showtime.cinema.cancellationPolicy);

  const res = await app.inject({ method: 'POST', url: '/v1/bookings', payload: { holdId: hold.id, guest, paymentMethod: 'card', acceptPolicy: true } });
  assert.equal(res.statusCode, 201);
  const booking = res.json();
  assert.equal(booking.tickets.length, 2);
  assert.equal(booking.price.total, booking.showtime.price * 2 + 10);
  assert.match(booking.reference, /^YL-/);
  assert.equal((await app.inject(`/v1/bookings/${booking.id}`)).json().reference, booking.reference);

  const map = (await app.inject(`/v1/showtimes/${showtimeId}/seats`)).json();
  assert.ok(seats.every((s) => map.unavailable.includes(s)));
  // The hold is used up, so paying twice fails.
  const again = await app.inject({ method: 'POST', url: '/v1/bookings', payload: { holdId: hold.id, guest, paymentMethod: 'card', acceptPolicy: true } });
  assert.equal(again.statusCode, 410);
});

test('a failed payment releases the hold', async () => {
  const app = await buildApp({ payments: { charge: async () => ({ ok: false, reason: 'declined' }), refund: async () => {} } });
  const { showtimeId, seats, hold } = await holdTwoSeats(app);
  const res = await app.inject({ method: 'POST', url: '/v1/bookings', payload: { holdId: hold.id, guest, paymentMethod: 'wallet', acceptPolicy: true } });
  assert.equal(res.statusCode, 402);
  const map = (await app.inject(`/v1/showtimes/${showtimeId}/seats`)).json();
  assert.ok(seats.every((s) => !map.unavailable.includes(s)));
});

test('a failed cinema confirmation refunds the payment', async () => {
  const refunds: string[] = [];
  const app = await buildApp({
    payments: { charge: async () => ({ ok: true, paymentRef: 'p1' }), refund: async (ref) => { refunds.push(ref); } },
    cinema: { confirm: async () => ({ ok: false, reason: 'seat sold at box office' }) },
  });
  const { hold } = await holdTwoSeats(app);
  const res = await app.inject({ method: 'POST', url: '/v1/bookings', payload: { holdId: hold.id, guest, paymentMethod: 'card', acceptPolicy: true } });
  assert.equal(res.statusCode, 409);
  assert.deepEqual(refunds, ['p1']);
});

test('checkout requires guest details and policy acceptance', async () => {
  const app = await buildApp();
  const { hold } = await holdTwoSeats(app);
  const bad = await app.inject({ method: 'POST', url: '/v1/bookings', payload: { holdId: hold.id, guest: { ...guest, email: 'nope' }, paymentMethod: 'card', acceptPolicy: true } });
  assert.equal(bad.statusCode, 400);
  const noPolicy = await app.inject({ method: 'POST', url: '/v1/bookings', payload: { holdId: hold.id, guest, paymentMethod: 'card', acceptPolicy: false } });
  assert.equal(noPolicy.statusCode, 400);
});

test('unbuilt features answer 501', async () => {
  const app = await buildApp();
  assert.equal((await app.inject({ method: 'GET', url: '/v1/resale/listings' })).statusCode, 501);
});

test('listings come back in Arabic when asked', async () => {
  const app = await buildApp();
  const headers = { 'accept-language': 'ar-EG,ar;q=0.9' };
  const [movie] = (await app.inject({ url: '/v1/movies', headers })).json();
  assert.equal(movie.genre, 'دراما');
  assert.equal(movie.title, 'The Last Light');
  const { results } = (await app.inject({ url: '/v1/movies/the-last-light/showtimes', headers })).json();
  assert.match(results[0].cinema.detail, /[؀-ۿ]/);
  const english = (await app.inject('/v1/movies')).json();
  assert.equal(english[0].genre, 'Drama');
});

test('two customers racing for the same seats: exactly one gets them', async () => {
  const app = await buildApp();
  const payload = await bestTwo(app);
  const codes = await Promise.all(['racer-one', 'racer-two', 'racer-three'].map((c) =>
    app.inject({ method: 'POST', url: '/v1/holds', payload, headers: as(c) }).then((r) => r.statusCode)));
  assert.deepEqual(codes.sort(), [201, 409, 409]);
});

test('a booking is capped at 10 seats', async () => {
  const app = await buildApp();
  const { results } = (await app.inject('/v1/movies/the-last-light/showtimes?count=10&arrangement=either')).json();
  assert.ok(results.length > 0);
  assert.equal((await app.inject('/v1/movies/the-last-light/showtimes?count=11')).statusCode, 400);
  assert.equal((await app.inject(`/v1/showtimes/${results[0].showtimeId}/seats?count=11`)).statusCode, 400);

  const { groups } = (await app.inject(`/v1/showtimes/${results[0].showtimeId}/seats?count=1&arrangement=connected`)).json();
  const free = groups.map((g: { seats: string[] }) => g.seats[0]);
  const hold = (seats: string[]) => app.inject({ method: 'POST', url: '/v1/holds', payload: { showtimeId: results[0].showtimeId, seats }, headers: as('big-group') });
  assert.equal((await hold(free.slice(0, 11))).statusCode, 400);
  assert.equal((await hold(free.slice(0, 10))).statusCode, 201);
});
