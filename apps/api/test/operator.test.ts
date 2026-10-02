import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.ts';
import { createDb } from '../src/db/index.ts';
import { Accounts } from '../src/data/accounts.ts';
import { DEMO_STAFF_PASSWORD, createOperator, demoStaffEmail } from '../src/data/operator.ts';
import { cinemas } from '../src/data/seed.ts';

type App = Awaited<ReturnType<typeof buildApp>>;
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const guest = { name: 'Mona Adel', email: 'mona@example.com', mobile: '+20 100 123 4567' };

/** Signs in as the demo staff member of a cinema (seeded on the embedded database). */
async function staff(app: App, cinemaId: string) {
  const res = await app.inject({ method: 'POST', url: '/v1/auth/sign-in', payload: { email: demoStaffEmail(cinemaId), password: DEMO_STAFF_PASSWORD } });
  assert.equal(res.statusCode, 200);
  return bearer(res.json().token);
}

/** Today's first listed showtime of a movie at a cinema, as customers see it in search. */
async function showAt(app: App, cinemaId: string, movieId = 'the-last-light') {
  const { results } = (await app.inject(`/v1/movies/${movieId}/showtimes?count=1&cinemaId=${cinemaId}`)).json();
  assert.ok(results.length, `no showtime of ${movieId} at ${cinemaId}`);
  return results[0] as { showtimeId: string; startsAt: string; localTime: string; price: number; format: string };
}

async function hold(app: App, showtimeId: string, count = 2, client = `client-${Math.random().toString(36).slice(2, 10)}`) {
  const { best } = (await app.inject(`/v1/showtimes/${showtimeId}/seats?count=${count}&arrangement=either`)).json();
  return app.inject({ method: 'POST', url: '/v1/holds', payload: { showtimeId, seats: best.seats }, headers: { 'x-client-id': client } });
}

async function book(app: App, showtimeId: string, count = 2, holder = guest) {
  const held = await hold(app, showtimeId, count);
  assert.equal(held.statusCode, 201);
  const res = await app.inject({ method: 'POST', url: '/v1/bookings', payload: { holdId: held.json().id, guest: holder, paymentMethod: 'card', acceptPolicy: true } });
  assert.equal(res.statusCode, 201);
  return res.json() as { id: string; reference: string; tickets: { seat: string }[]; price: { total: number }; showtime: { startsAt: string; price: number; format: string } };
}

const correct = (app: App, headers: Record<string, string>, id: string, payload: Record<string, unknown>) =>
  app.inject({ method: 'PATCH', url: `/v1/operator/showtimes/${id}`, headers, payload });

test('the embedded database has one demo staff account per cinema', async () => {
  const app = await buildApp();
  const demo = (await app.inject('/v1/operator/demo-accounts')).json();
  assert.equal(demo.password, DEMO_STAFF_PASSWORD);
  assert.deepEqual(demo.accounts.map((a: { cinemaId: string }) => a.cinemaId), cinemas.map((c) => c.id));
  for (const c of cinemas) {
    const me = (await app.inject({ url: '/v1/me', headers: await staff(app, c.id) })).json();
    assert.equal(me.role, 'operator');
    assert.equal(me.cinemaId, c.id);
  }
});

test('staff see only their own cinema: another cinema\'s bookings are not found and its showtimes are 403', async () => {
  const app = await buildApp();
  const vox = await staff(app, 'vox-moe');
  const voxShow = await showAt(app, 'vox-moe');
  const reelShow = await showAt(app, 'reel-cfc');
  const mine = await book(app, voxShow.showtimeId, 2);
  const theirs = await book(app, reelShow.showtimeId, 1, { ...guest, name: 'Karim Nabil' });

  // Signed out: 401. A customer account: 403.
  assert.equal((await app.inject('/v1/operator/bookings')).statusCode, 401);
  const customer = (await app.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: { ...guest, password: 'popcorn-2026' } })).json();
  assert.equal((await app.inject({ url: '/v1/operator/bookings', headers: bearer(customer.token) })).statusCode, 403);
  assert.equal((await correct(app, bearer(customer.token), voxShow.showtimeId, { price: 1 })).statusCode, 403);

  const day = (await app.inject({ url: '/v1/operator/bookings', headers: vox })).json();
  assert.equal(day.cinema.id, 'vox-moe');
  assert.ok(day.shows.length > 0 && day.shows.every((s: { id: string }) => s.id.includes('_vox-moe_')));
  const listed = day.shows.flatMap((s: { bookings: { reference: string }[] }) => s.bookings.map((b) => b.reference));
  assert.deepEqual(listed, [mine.reference]);
  const show = day.shows.find((s: { id: string }) => s.id === voxShow.showtimeId);
  assert.equal(show.bookings[0].holderName, 'Mona Adel');
  assert.deepEqual([...show.bookings[0].seats].sort(), mine.tickets.map((t) => t.seat).sort());
  assert.deepEqual(show.bookings[0].tickets.map((t: { status: string }) => t.status), ['valid', 'valid']);
  assert.equal(show.bookings[0].email, undefined); // Staff get no contact details.
  assert.deepEqual(show.totals, { bookings: 1, tickets: 2, ticketRevenue: voxShow.price * 2, fees: 10 });
  assert.equal(day.totals.tickets, 2);

  // Search by reference: with or without "YL-", any case. Another cinema's booking answers exactly like an
  // unknown reference, so it doesn't reveal that the reference exists.
  const found = await app.inject({ url: `/v1/operator/bookings/${mine.reference.slice(3).toLowerCase()}`, headers: vox });
  assert.equal(found.statusCode, 200);
  assert.equal(found.json().booking.reference, mine.reference);
  assert.equal(found.json().show.id, voxShow.showtimeId);
  const elsewhere = await app.inject({ url: `/v1/operator/bookings/${theirs.reference}`, headers: vox });
  const unknown = await app.inject({ url: '/v1/operator/bookings/YL-ZZZZZZ', headers: vox });
  assert.equal(elsewhere.statusCode, 404);
  assert.equal(unknown.statusCode, 404);
  assert.deepEqual(elsewhere.json(), unknown.json());

  // Another cinema's showtime can be neither seen nor corrected.
  assert.equal((await app.inject({ url: `/v1/operator/showtimes/${reelShow.showtimeId}`, headers: vox })).statusCode, 403);
  assert.equal((await correct(app, vox, reelShow.showtimeId, { price: 1 })).statusCode, 403);
  assert.equal((await correct(app, vox, 'no-such-show', { price: 100 })).statusCode, 404);
  assert.equal((await showAt(app, 'reel-cfc')).price, reelShow.price);
});

test('a resold seat counts once in staff totals and seats left, and stays taken for customers', async () => {
  const app = await buildApp({ clock: () => Date.parse('2026-10-01T06:00:00Z') }); // 09:00 in Cairo, before every show
  const vox = await staff(app, 'vox-moe');
  const show = await showAt(app, 'vox-moe');
  const signUp = async (name: string) => bearer((await app.inject({
    method: 'POST', url: '/v1/auth/sign-up', payload: { ...guest, name, email: `${name.toLowerCase()}@example.com`, password: 'popcorn-2026' } })).json().token);
  const seller = await signUp('Seller');
  const buyer = await signUp('Buyer');
  const held = await hold(app, show.showtimeId, 2);
  const booking = (await app.inject({ method: 'POST', url: '/v1/bookings', headers: seller,
    payload: { holdId: held.json().id, guest, paymentMethod: 'card', acceptPolicy: true } })).json() as { id: string; tickets: { id: string; seat: string }[] };
  const view = async () => (await app.inject({ url: `/v1/operator/showtimes/${show.showtimeId}`, headers: vox })).json().show;
  const before = await view();
  assert.deepEqual(before.totals, { bookings: 1, tickets: 2, ticketRevenue: show.price * 2, fees: 10 });

  // The seller resells one ticket: it becomes 'transferred' and the buyer gets a replacement for the same seat.
  const [resold, kept] = booking.tickets;
  await app.inject({ method: 'POST', url: '/v1/resale/payout-method', headers: seller, payload: { kind: 'wallet', mobile: '010 1234 5678' } });
  const listing = (await app.inject({ method: 'POST', url: '/v1/resale/listings', headers: seller,
    payload: { bookingId: booking.id, ticketIds: [resold.id], price: show.price - 20 } })).json();
  const bought = await app.inject({ method: 'POST', url: `/v1/resale/listings/${listing.id}/purchase`, headers: buyer, payload: { ticketIds: [resold.id], paymentMethod: 'wallet' } });
  assert.equal(bought.statusCode, 201, bought.body);

  // Staff count the seat once, and the cinema's revenue is still what the seller paid it; the buyer's 5 EGP fee is YALLA's.
  const after = await view();
  assert.deepEqual(after.totals, { bookings: 2, tickets: 2, ticketRevenue: show.price * 2, fees: 15 });
  assert.equal(after.seatsLeft, before.seatsLeft);
  const statuses = (b: { resale: boolean; tickets: { seat: string; status: string }[] }) => [b.resale, Object.fromEntries(b.tickets.map((t) => [t.seat, t.status]))];
  assert.deepEqual(after.bookings.map(statuses).sort(), [[false, { [resold.seat]: 'transferred', [kept.seat]: 'valid' }], [true, { [resold.seat]: 'valid' }]]);
  const day = (await app.inject({ url: '/v1/operator/bookings', headers: vox })).json();
  assert.deepEqual([day.totals.tickets, day.totals.ticketRevenue], [2, show.price * 2]);
  assert.equal(day.shows.find((s: { id: string }) => s.id === show.showtimeId).seatsLeft, before.seatsLeft);

  // Customers still see the seat taken, once: on the seat map, in search and when holding it.
  const map = (await app.inject(`/v1/showtimes/${show.showtimeId}/seats?count=1&arrangement=connected`)).json();
  assert.deepEqual(map.unavailable.filter((s: string) => s === resold.seat), [resold.seat]);
  assert.ok(map.groups.every((g: { seats: string[] }) => !g.seats.includes(resold.seat)));
  const { results } = (await app.inject('/v1/movies/the-last-light/showtimes?count=1&arrangement=connected&cinemaId=vox-moe')).json();
  assert.equal(results.find((r: { showtimeId: string }) => r.showtimeId === show.showtimeId).matches.connected, after.seatsLeft);
  const late = await app.inject({ method: 'POST', url: '/v1/holds', payload: { showtimeId: show.showtimeId, seats: [resold.seat] }, headers: { 'x-client-id': 'late-customer' } });
  assert.equal(late.statusCode, 409);
  assert.deepEqual(late.json().unavailable, [resold.seat]);
});

test('a ticket in any status but transferred counts in staff totals and keeps its seat taken', async () => {
  const db = await createDb(undefined, 'memory://');
  const app = await buildApp({ db });
  const vox = await staff(app, 'vox-moe');
  const show = await showAt(app, 'vox-moe');
  const booking = await book(app, show.showtimeId, 2);
  const view = async () => (await app.inject({ url: `/v1/operator/showtimes/${show.showtimeId}`, headers: vox })).json().show;
  const before = await view();
  // E.g. a resale transfer the cinema may already have made: unusable and off sale, but the seat is not free.
  const seat = booking.tickets[0].seat;
  await db.query(`UPDATE tickets SET status = 'under-review' WHERE showtime_id = $1 AND seat = $2`, [show.showtimeId, seat]);
  const after = await view();
  assert.deepEqual(after.totals, before.totals);
  assert.equal(after.seatsLeft, before.seatsLeft);
  assert.ok((await app.inject(`/v1/showtimes/${show.showtimeId}/seats`)).json().unavailable.includes(seat));
  const late = await app.inject({ method: 'POST', url: '/v1/holds', payload: { showtimeId: show.showtimeId, seats: [seat] }, headers: { 'x-client-id': 'late-customer' } });
  assert.deepEqual([late.statusCode, late.json().unavailable], [409, [seat]]);
  await app.close();
});

test('corrections apply to listings, search, seat maps, holds and new bookings', async () => {
  const app = await buildApp();
  const vox = await staff(app, 'vox-moe');
  const before = await showAt(app, 'vox-moe');
  const day = before.startsAt.slice(0, 10);

  const res = await correct(app, vox, before.showtimeId, { price: 260, format: 'IMAX', time: '23:40' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().show.price, 260);
  assert.equal(res.json().show.listed.price, before.price);
  assert.equal(res.json().change.kind, 'changed');
  assert.equal(res.json().change.affectedBookings, 0);

  // Search: new price, format and time, and time filters and sorting use the new time.
  const { results } = (await app.inject('/v1/movies/the-last-light/showtimes?count=1&cinemaId=vox-moe&from=23:30')).json();
  const after = results.find((r: { showtimeId: string }) => r.showtimeId === before.showtimeId);
  assert.ok(after, 'the moved show is found by its new time');
  assert.deepEqual([after.price, after.format, after.localTime], [260, 'IMAX', '23:40']);
  assert.equal(after.startsAt, `${day}T23:40:00${before.startsAt.slice(19)}`);
  const all = (await app.inject('/v1/movies/the-last-light/showtimes?count=1&cinemaId=vox-moe')).json().results;
  assert.equal(all.at(-1).showtimeId, before.showtimeId);

  // Showtime summary, seat map, hold and booking.
  assert.equal((await app.inject(`/v1/showtimes/${before.showtimeId}`)).json().localTime, '23:40');
  const held = await hold(app, before.showtimeId, 2);
  assert.equal(held.statusCode, 201);
  assert.equal(held.json().price.tickets, 520);
  const booking = await book(app, before.showtimeId, 1);
  assert.equal(booking.showtime.price, 260);
  assert.equal(booking.showtime.format, 'IMAX');
  assert.match(booking.showtime.startsAt, /T23:40:00/);
  assert.equal(booking.price.total, 265);

  // Setting a value back to the cinema's listing removes the correction.
  await correct(app, vox, before.showtimeId, { price: before.price, format: before.format, time: before.localTime });
  const view = (await app.inject({ url: `/v1/operator/showtimes/${before.showtimeId}`, headers: vox })).json();
  assert.equal(view.show.corrected, false);
  assert.equal(view.changes.length, 2);
  assert.equal((await showAt(app, 'vox-moe')).price, before.price);
});

test('a correction made on one API instance is served by every instance', async () => {
  const db = await createDb(undefined, 'memory://');
  const one = await buildApp({ db });
  const two = await buildApp({ db });
  const show = await showAt(two, 'galaxy-maadi');
  assert.equal((await correct(one, await staff(one, 'galaxy-maadi'), show.showtimeId, { price: 175 })).statusCode, 200);
  const seen = (await two.inject(`/v1/showtimes/${show.showtimeId}`)).json();
  assert.equal(seen.price, 175);
  await one.close(); // Closes the shared database.
});

test('a cancelled show cannot be found, held or booked, and reinstating it reopens sales', async () => {
  const app = await buildApp();
  const reel = await staff(app, 'reel-cfc');
  const show = await showAt(app, 'reel-cfc', 'redline');
  const pending = await hold(app, show.showtimeId, 2);
  assert.equal(pending.statusCode, 201);

  const cancelled = await correct(app, reel, show.showtimeId, { cancelled: true });
  assert.equal(cancelled.statusCode, 200);
  assert.equal(cancelled.json().change.kind, 'cancelled');
  assert.equal(cancelled.json().show.cancelled, true);

  const results = (await app.inject('/v1/movies/redline/showtimes?count=1&cinemaId=reel-cfc')).json().results;
  assert.ok(results.every((r: { showtimeId: string }) => r.showtimeId !== show.showtimeId));
  assert.equal((await app.inject(`/v1/showtimes/${show.showtimeId}`)).statusCode, 404);
  assert.equal((await app.inject(`/v1/showtimes/${show.showtimeId}/seats`)).statusCode, 404);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/holds', payload: { showtimeId: show.showtimeId, seats: pending.json().seats } })).statusCode, 404);
  // The checkout already in progress was released and cannot be paid for.
  assert.equal((await app.inject(`/v1/holds/${pending.json().id}`)).statusCode, 410);
  const pay = await app.inject({ method: 'POST', url: '/v1/bookings', payload: { holdId: pending.json().id, guest, paymentMethod: 'card', acceptPolicy: true } });
  assert.equal(pay.statusCode, 410);

  // Staff still see the cancelled show, and can reinstate it.
  const day = (await app.inject({ url: '/v1/operator/bookings', headers: reel })).json();
  assert.equal(day.shows.find((s: { id: string }) => s.id === show.showtimeId).cancelled, true);
  assert.equal(day.totals.cancelled, 1);
  const reinstated = await correct(app, reel, show.showtimeId, { cancelled: false });
  assert.equal(reinstated.json().change.kind, 'reinstated');
  assert.equal((await hold(app, show.showtimeId, 2)).statusCode, 201);
});

test('customers whose show changed or was cancelled see a notice on their ticket; the change records who is affected', async () => {
  const app = await buildApp();
  const vox = await staff(app, 'vox-moe');
  const show = await showAt(app, 'vox-moe', 'redline');
  const other = await showAt(app, 'vox-moe', 'the-last-light');
  const booking = await book(app, show.showtimeId, 2);
  const elsewhere = await book(app, other.showtimeId, 1);
  const ticket = async (id: string, lang = 'en') => (await app.inject({ url: `/v1/bookings/${id}`, headers: { 'accept-language': lang } })).json();
  assert.equal((await ticket(booking.id)).showChange, null);

  // A new price applies to new bookings only: nobody who already has tickets is affected.
  const priced = await correct(app, vox, show.showtimeId, { price: show.price + 20 });
  assert.equal(priced.json().change.affectedBookings, 0);
  assert.equal((await ticket(booking.id)).showChange, null);

  // A new time and format: the ticket keeps what was bought and says what changed.
  const moved = await correct(app, vox, show.showtimeId, { time: '23:15', format: 'Premium' });
  assert.equal(moved.json().change.affectedBookings, 1);
  const notice = await ticket(booking.id);
  assert.equal(notice.showtime.startsAt, booking.showtime.startsAt);
  assert.equal(notice.showtime.price, show.price);
  assert.equal(notice.showChange.kind, 'changed');
  assert.equal(notice.showChange.localTime, '23:15');
  assert.deepEqual(notice.showChange.changed, ['time', 'format']);
  assert.equal((await ticket(booking.id, 'ar')).showChange.format, 'بريميم');
  assert.equal((await ticket(elsewhere.id)).showChange, null);

  // Moved back to what they bought: nothing to tell them.
  await correct(app, vox, show.showtimeId, { time: show.localTime, format: show.format });
  assert.equal((await ticket(booking.id)).showChange, null);

  await correct(app, vox, show.showtimeId, { cancelled: true });
  assert.equal((await ticket(booking.id)).showChange.kind, 'cancelled');

  // Staff see every change, who made it and which bookings each one affected (not yet notified: no email provider).
  const { changes } = (await app.inject({ url: `/v1/operator/showtimes/${show.showtimeId}`, headers: vox })).json();
  assert.deepEqual(changes.map((c: { kind: string }) => c.kind), ['cancelled', 'changed', 'changed', 'changed']);
  assert.equal(changes[0].by, 'VOX staff');
  assert.deepEqual(changes[0].affected, [{ reference: booking.reference, holderName: 'Mona Adel', notifiedAt: null }]);
  assert.deepEqual(changes[3].affected, []);
});

test('staff see bookings by day: yesterday\'s shows with their bookings and corrections, no longer correctable', async () => {
  let now = Date.now();
  const app = await buildApp({ clock: () => now });
  const reel = await staff(app, 'reel-cfc');
  const show = await showAt(app, 'reel-cfc', 'a-little-chaos');
  const booking = await book(app, show.showtimeId, 2);
  await correct(app, reel, show.showtimeId, { time: '23:30' });
  const yesterday = show.startsAt.slice(0, 10);

  now += 24 * 60 * 60 * 1000;
  const today = (await app.inject({ url: '/v1/operator/bookings', headers: reel })).json();
  assert.notEqual(today.day, yesterday);
  assert.deepEqual(today.days, [today.day, yesterday]);
  assert.equal(today.totals.bookings, 0);

  const before = (await app.inject({ url: `/v1/operator/bookings?day=${yesterday}`, headers: reel })).json();
  assert.equal(before.day, yesterday);
  assert.equal(before.shows.length, 1);
  const [past] = before.shows;
  assert.deepEqual([past.id, past.localTime, past.corrected, past.editable, past.listed], [show.showtimeId, '23:30', true, false, null]);
  assert.equal(past.bookings[0].reference, booking.reference);
  assert.equal(past.bookings[0].sold.startsAt, show.startsAt);
  assert.equal((await correct(app, reel, show.showtimeId, { price: 100 })).statusCode, 404);
  assert.equal((await app.inject({ url: `/v1/operator/bookings/${booking.reference}`, headers: reel })).json().show.editable, false);
});

test('corrections are checked: positive sane price, known format, a time on the same day', async () => {
  const app = await buildApp();
  const galaxy = await staff(app, 'galaxy-maadi');
  const { showtimeId } = await showAt(app, 'galaxy-maadi');
  for (const payload of [{}, { price: 0 }, { price: -5 }, { price: 99999 }, { price: 150.5 }, { format: 'VHS' }, { time: '25:00' }, { time: '7pm' }, { time: '2026-10-02T19:00' }, { cancelled: 'maybe' }])
    assert.equal((await correct(app, galaxy, showtimeId, payload)).statusCode, 400, JSON.stringify(payload));
  const unchanged = await correct(app, galaxy, showtimeId, { price: (await showAt(app, 'galaxy-maadi')).price });
  assert.equal(unchanged.statusCode, 200);
  assert.equal(unchanged.json().change, null);
  assert.equal((await app.inject({ url: '/v1/operator/bookings?day=yesterday', headers: galaxy })).statusCode, 400);
});

test('create-operator makes a staff account for a known cinema', async () => {
  const db = await createDb(undefined, 'memory://');
  try {
    const accounts = new Accounts(db);
    const made = await createOperator(accounts, cinemas, { cinema: 'reel-cfc', email: 'Duty.Manager@reel.example', name: 'Duty manager' });
    assert.equal(made.account.role, 'operator');
    assert.equal(made.account.cinemaId, 'reel-cfc');
    assert.ok(made.generatedPassword && made.generatedPassword.length >= 12);
    assert.equal((await accounts.verify('duty.manager@reel.example', made.generatedPassword))?.id, made.account.id);
    await assert.rejects(createOperator(accounts, cinemas, { cinema: 'reel-cfc', email: 'duty.manager@reel.example', name: 'Again' }), /already exists/);
    await assert.rejects(createOperator(accounts, cinemas, { cinema: 'nowhere', email: 'a@b.example', name: 'Nobody' }), /Unknown cinema/);
    await assert.rejects(createOperator(accounts, cinemas, { cinema: 'reel-cfc', email: 'b@b.example', name: 'Short', password: 'short' }), /at least 12/);
  } finally {
    await db.close();
  }
});
