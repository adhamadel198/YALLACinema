import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.ts';

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
  const huge = await app.inject('/v1/movies/the-last-light/showtimes?count=13&arrangement=connected');
  assert.deepEqual(huge.json().results, []);
});

test('a hold blocks the same seats for the next customer', async () => {
  const app = await buildApp();
  const { results } = (await app.inject('/v1/movies/the-last-light/showtimes?count=2&arrangement=connected')).json();
  const seats = (await app.inject(`/v1/showtimes/${results[0].showtimeId}/seats?count=2&arrangement=connected`)).json();
  const body = { showtimeId: results[0].showtimeId, seats: seats.best.seats };
  const first = await app.inject({ method: 'POST', url: '/v1/holds', payload: body });
  assert.equal(first.statusCode, 201);
  assert.equal(first.json().price.fees, 10);
  const second = await app.inject({ method: 'POST', url: '/v1/holds', payload: body });
  assert.equal(second.statusCode, 409);
  assert.equal((await app.inject({ method: 'DELETE', url: `/v1/holds/${first.json().id}` })).statusCode, 204);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/holds', payload: body })).statusCode, 201);
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
