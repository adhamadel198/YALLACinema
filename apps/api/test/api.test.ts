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

test('unbuilt features answer 501', async () => {
  const app = await buildApp();
  assert.equal((await app.inject({ method: 'POST', url: '/v1/bookings' })).statusCode, 501);
});
