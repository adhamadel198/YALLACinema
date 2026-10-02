import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { buildApp } from '../src/app.ts';
import { createDb } from '../src/db/index.ts';

const mona = { name: 'Mona Adel', email: 'Mona@Example.com', mobile: '+20 100 123 4567', password: 'popcorn-2026' };
const karim = { name: 'Karim Nabil', email: 'karim@example.com', mobile: '01001234567', password: 'nachos-2026' };
type App = Awaited<ReturnType<typeof buildApp>>;
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

test('sign up, sign in, see your account, sign out', async () => {
  const app = await buildApp();
  const up = await app.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: mona });
  assert.equal(up.statusCode, 201);
  assert.equal(up.json().account.email, 'mona@example.com');
  assert.equal(up.json().account.role, 'customer');
  assert.equal((await app.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: mona })).statusCode, 409);

  assert.equal((await app.inject({ method: 'POST', url: '/v1/auth/sign-in', payload: { email: mona.email, password: 'wrong-password' } })).statusCode, 401);
  const signIn = await app.inject({ method: 'POST', url: '/v1/auth/sign-in', payload: { email: 'mona@example.com', password: mona.password } });
  assert.equal(signIn.statusCode, 200);
  const { token } = signIn.json();

  const me = await app.inject({ url: '/v1/me', headers: bearer(token) });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().name, 'Mona Adel');
  assert.equal(me.json().password_hash, undefined);

  assert.equal((await app.inject({ method: 'POST', url: '/v1/auth/sign-out', headers: bearer(token) })).statusCode, 204);
  assert.equal((await app.inject({ url: '/v1/me', headers: bearer(token) })).statusCode, 401);
  assert.equal((await app.inject('/v1/me')).statusCode, 401);
});

test('sign-up and sign-in are rate limited per client address, whatever X-Client-Id says', async () => {
  const app = await buildApp();
  const signIn = (i: number, remoteAddress?: string) => app.inject({
    method: 'POST', url: '/v1/auth/sign-in', remoteAddress,
    // A new X-Client-Id every time, and a new email so only the per-address limit applies.
    headers: { 'x-client-id': `rotating-client-${i}` }, payload: { email: `guess${i}@example.com`, password: 'wrong-password' },
  });
  const codes = [];
  for (let i = 0; i < 11; i++) codes.push((await signIn(i)).statusCode);
  assert.deepEqual(codes, [...Array(10).fill(401), 429]);
  assert.equal((await signIn(11, '203.0.113.7')).statusCode, 401); // Another address has its own allowance.

  const signUps = [];
  for (let i = 0; i < 11; i++) {
    signUps.push((await app.inject({ method: 'POST', url: '/v1/auth/sign-up', headers: { 'x-client-id': `rotating-client-${i}` },
      payload: { ...mona, email: `new${i}@example.com` } })).statusCode);
  }
  assert.deepEqual(signUps, [...Array(10).fill(201), 429]);
});

test('ten failed sign-ins lock an email for 15 minutes on every API instance and from every address', async () => {
  let now = Date.parse('2026-10-01T06:00:00Z');
  const db = await createDb(undefined, 'memory://');
  const one = await buildApp({ db, clock: () => now });
  const two = await buildApp({ db, clock: () => now });
  await one.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: mona });
  let addresses = 0;
  // Each attempt from a new address, so the per-address limit never applies.
  const signIn = (app: App, email: string, password: string) =>
    app.inject({ method: 'POST', url: '/v1/auth/sign-in', payload: { email, password }, remoteAddress: `198.51.100.${++addresses}` });

  // A successful sign-in is not a failure.
  for (let i = 0; i < 9; i++) assert.equal((await signIn(i % 2 ? one : two, mona.email, 'wrong-password')).statusCode, 401);
  assert.equal((await signIn(one, mona.email, mona.password)).statusCode, 200);
  assert.equal((await signIn(two, mona.email, 'wrong-password')).statusCode, 401);

  // Ten failures: refused even with the right password, on either instance, however the email is typed.
  const locked = await signIn(two, mona.email, mona.password);
  assert.equal(locked.statusCode, 429);
  assert.equal(locked.json().error, 'Too many failed sign-ins for this email. Please try again in 15 minutes.');
  assert.equal(locked.headers['retry-after'], '900');
  assert.equal((await signIn(one, ' MONA@example.COM ', mona.password)).statusCode, 429);

  // Other emails are unaffected, and an email without an account locks the same way, so the lock reveals nothing.
  await one.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: karim });
  assert.equal((await signIn(one, karim.email, karim.password)).statusCode, 200);
  for (let i = 0; i < 10; i++) assert.equal((await signIn(one, 'nobody@example.com', 'wrong-password')).statusCode, 401);
  assert.equal((await signIn(two, 'nobody@example.com', 'wrong-password')).json().error, locked.json().error);

  // Refused attempts don't extend the lock: it ends 15 minutes after the failures.
  now += 14 * 60 * 1000;
  assert.equal((await signIn(one, mona.email, mona.password)).json().error, 'Too many failed sign-ins for this email. Please try again in 1 minute.');
  now += 60 * 1000;
  assert.equal((await signIn(two, mona.email, mona.password)).statusCode, 200);
  await one.close(); // Closes the shared database.
});

test('sessions expire after 30 days', async () => {
  let now = Date.now();
  const app = await buildApp({ clock: () => now });
  const { token } = (await app.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: mona })).json();
  now += 30 * 24 * 60 * 60 * 1000 + 1;
  assert.equal((await app.inject({ url: '/v1/me', headers: bearer(token) })).statusCode, 401);
});

test('sign-up checks its fields', async () => {
  const app = await buildApp();
  assert.equal((await app.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: { ...mona, password: 'short' } })).statusCode, 400);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: { ...mona, email: 'nope' } })).statusCode, 400);
});

test('a booking made while signed in belongs to the account; a guest booking to nobody', async () => {
  const app = await buildApp();
  const { token, account } = (await app.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: mona })).json();
  const { results } = (await app.inject('/v1/movies/the-last-light/showtimes?count=1&arrangement=connected')).json();
  const { groups } = (await app.inject(`/v1/showtimes/${results[0].showtimeId}/seats?count=1&arrangement=connected`)).json();
  const book = async (seat: string, headers: Record<string, string>) => {
    const hold = (await app.inject({ method: 'POST', url: '/v1/holds', payload: { showtimeId: results[0].showtimeId, seats: [seat] }, headers })).json();
    const guest = { name: mona.name, email: mona.email, mobile: mona.mobile };
    return (await app.inject({ method: 'POST', url: '/v1/bookings', payload: { holdId: hold.id, guest, paymentMethod: 'card', acceptPolicy: true }, headers })).json();
  };
  assert.equal((await book(groups[0].seats[0], bearer(token))).accountId, account.id);
  assert.equal((await book(groups[1].seats[0], { 'x-client-id': 'guest-device-1' })).accountId, null);
});

const signUp = async (app: App, who: typeof mona) =>
  (await app.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: who })).json() as { token: string; account: { id: string } };

/** Books the best free seat at the first showtime, signed in or as a guest depending on headers. */
async function bookOne(app: App, headers: Record<string, string>, guest = { name: 'Mona Adel', email: 'mona@example.com', mobile: '+20 100 123 4567' }) {
  const { results } = (await app.inject('/v1/movies/the-last-light/showtimes?count=1&arrangement=connected')).json();
  const showtimeId = results[0].showtimeId;
  const { best } = (await app.inject(`/v1/showtimes/${showtimeId}/seats?count=1&arrangement=connected`)).json();
  const hold = (await app.inject({ method: 'POST', url: '/v1/holds', payload: { showtimeId, seats: best.seats }, headers })).json();
  const res = await app.inject({ method: 'POST', url: '/v1/bookings', payload: { holdId: hold.id, guest, paymentMethod: 'card', acceptPolicy: true }, headers });
  assert.equal(res.statusCode, 201);
  await sleep(5); // Keep creation times distinct so "newest first" is unambiguous.
  return res.json() as { id: string; reference: string };
}

const history = async (app: App, token: string, lang = 'en') =>
  (await app.inject({ url: '/v1/me/bookings', headers: { ...bearer(token), 'accept-language': lang } })).json() as { id: string }[];
const claim = (app: App, token: string, ids: string[]) =>
  app.inject({ method: 'POST', url: '/v1/me/bookings/claim', payload: { ids }, headers: bearer(token) });

test('booking history lists only your own bookings, newest first, shaped like GET /v1/bookings/:id', async () => {
  const app = await buildApp();
  const a = await signUp(app, mona);
  const b = await signUp(app, karim);
  assert.equal((await app.inject('/v1/me/bookings')).statusCode, 401);
  assert.deepEqual(await history(app, a.token), []);

  const first = await bookOne(app, bearer(a.token));
  const karims = await bookOne(app, bearer(b.token));
  await bookOne(app, { 'x-client-id': 'guest-device-1' });
  const second = await bookOne(app, bearer(a.token));

  const monas = await history(app, a.token);
  assert.deepEqual(monas.map((x) => x.id), [second.id, first.id]);
  assert.deepEqual(monas[0], (await app.inject(`/v1/bookings/${second.id}`)).json());
  assert.deepEqual((await history(app, b.token)).map((x) => x.id), [karims.id]);

  // Listings in the history follow the app's language, like the booking itself.
  const arabic = await history(app, a.token, 'ar');
  assert.deepEqual(arabic[0], (await app.inject({ url: `/v1/bookings/${second.id}`, headers: { 'accept-language': 'ar' } })).json());
  assert.notDeepEqual(arabic[0], monas[0]);
});

test('guest bookings from this device can be claimed once, and never from another account', async () => {
  const app = await buildApp();
  const guestBooking = await bookOne(app, { 'x-client-id': 'guest-device-1' });
  const a = await signUp(app, mona);
  const b = await signUp(app, karim);
  const monas = await bookOne(app, bearer(a.token));

  assert.equal((await app.inject({ method: 'POST', url: '/v1/me/bookings/claim', payload: { ids: [guestBooking.id] } })).statusCode, 401);

  // Unknown ids are ignored; the guest booking joins Mona's history.
  const claimed = await claim(app, a.token, [guestBooking.id, randomUUID()]);
  assert.equal(claimed.statusCode, 200);
  assert.deepEqual(claimed.json(), { claimed: [guestBooking.id] });
  assert.deepEqual((await history(app, a.token)).map((x) => x.id), [monas.id, guestBooking.id]);
  assert.equal((await app.inject(`/v1/bookings/${guestBooking.id}`)).json().accountId, a.account.id);

  // Karim knows both ids but can take neither: one was booked by Mona, the other she already claimed.
  assert.deepEqual((await claim(app, b.token, [monas.id, guestBooking.id])).json(), { claimed: [] });
  assert.deepEqual(await history(app, b.token), []);
  assert.deepEqual((await history(app, a.token)).map((x) => x.id), [monas.id, guestBooking.id]);

  // Claiming again is harmless.
  assert.deepEqual((await claim(app, a.token, [guestBooking.id])).json(), { claimed: [] });
  assert.deepEqual((await claim(app, a.token, [])).json(), { claimed: [] });
});

test('only guest bookings made with the account\'s email can be claimed, whoever knows their id', async () => {
  const app = await buildApp();
  const monas = await bookOne(app, { 'x-client-id': 'guest-device-1' }, { name: 'Mona Adel', email: 'MONA@EXAMPLE.COM', mobile: mona.mobile });
  // Karim booked as a guest and shared the link to his tickets, so Mona knows the id.
  const karims = await bookOne(app, { 'x-client-id': 'guest-device-2' }, { name: karim.name, email: karim.email, mobile: karim.mobile });
  const a = await signUp(app, mona);
  assert.deepEqual((await claim(app, a.token, [karims.id, monas.id])).json(), { claimed: [monas.id] }); // Email case doesn't matter.
  assert.deepEqual((await history(app, a.token)).map((x) => x.id), [monas.id]);
  assert.equal((await app.inject(`/v1/bookings/${karims.id}`)).json().accountId, null);

  // So Mona cannot resell Karim's tickets; Karim can still claim them.
  await app.inject({ method: 'POST', url: '/v1/resale/payout-method', headers: bearer(a.token), payload: { kind: 'wallet', mobile: '010 1234 5678' } });
  const ticketIds = (await app.inject(`/v1/bookings/${karims.id}`)).json().tickets.map((t: { id: string }) => t.id);
  const listing = await app.inject({ method: 'POST', url: '/v1/resale/listings', headers: bearer(a.token), payload: { bookingId: karims.id, ticketIds, price: 50 } });
  assert.notEqual(listing.statusCode, 201);
  const b = await signUp(app, karim);
  assert.deepEqual((await claim(app, b.token, [karims.id])).json(), { claimed: [karims.id] });
});

test('claiming checks its input', async () => {
  const app = await buildApp();
  const { token } = await signUp(app, mona);
  assert.equal((await claim(app, token, ['not-a-booking-id'])).statusCode, 400);
  assert.equal((await claim(app, token, Array.from({ length: 101 }, () => randomUUID()))).statusCode, 400);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/me/bookings/claim', payload: {}, headers: bearer(token) })).statusCode, 400);
});
