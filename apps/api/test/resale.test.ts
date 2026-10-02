import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyBaseLogger, FastifyRequest } from 'fastify';
import { buildApp } from '../src/app.ts';
import { createDb, isUniqueViolation, type Db } from '../src/db/index.ts';
import { sandboxCinema, type CinemaIntegration, type CinemaResale } from '../src/integrations/cinema.ts';
import { sandboxPayments, type PaymentProvider } from '../src/integrations/payments.ts';
import { DEMO_STAFF_PASSWORD, demoStaffEmail } from '../src/data/operator.ts';
import { Resale } from '../src/data/resale.ts';
import { resaleSweep } from '../src/routes/resale.ts';

type App = Awaited<ReturnType<typeof buildApp>>;
type Headers = Record<string, string>;

// 09:00 in Cairo, so every seed showtime today is still ahead.
const MORNING = Date.parse('2026-10-01T06:00:00Z');
const wallet = { kind: 'wallet', mobile: '010 1234 5678' };

function cinemaWith(resale: Partial<CinemaResale>): CinemaIntegration {
  return { ...sandboxCinema, resale: { ...sandboxCinema.resale!, ...resale } };
}

/** Reactivation runs in the background after the request that starts it, so its outcome is polled for. */
async function eventually(check: () => Promise<boolean>, what: string) {
  for (let i = 0; i < 200; i++) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.fail(`Timed out waiting for ${what}`);
}

/**
 * A payment provider that approves everything until `start()`, which begins recording charges and refunds
 * and can swap in a charge that fails or stalls. Call it after setup so the seller's own booking goes through.
 */
function recordingPayments() {
  const charges: number[] = [];
  const refunds: string[] = [];
  let recording = false;
  let charge: PaymentProvider['charge'] = sandboxPayments.charge;
  const payments: PaymentProvider = {
    async charge(input) {
      if (recording) charges.push(input.amount);
      return charge(input);
    },
    async refund(ref) { if (recording) refunds.push(ref); },
  };
  const start = (custom?: PaymentProvider['charge']) => {
    recording = true;
    if (custom) charge = custom;
  };
  return { payments, charges, refunds, start };
}

/** What the API logs at error level, to check support is alerted. */
function errorLog() {
  const errors: { msg: string; [key: string]: unknown }[] = [];
  return { errors, logger: { level: 'error', stream: { write: (line: string) => { errors.push(JSON.parse(line)); } } } };
}

async function setup(options: { cinema?: CinemaIntegration; payments?: PaymentProvider; db?: Db; logger?: ReturnType<typeof errorLog>['logger'] } = {}) {
  let now = MORNING;
  const app = await buildApp({ clock: () => now, ...options });
  let clients = 0;
  const signUp = async (name: string) => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/sign-up', headers: { 'x-client-id': `signup-${name}` },
      payload: { name, email: `${name.toLowerCase()}@example.com`, mobile: '+20 100 123 4567', password: 'popcorn-2026' } });
    assert.equal(res.statusCode, 201, res.body);
    const { token, account } = res.json();
    return { id: account.id as string, headers: { authorization: `Bearer ${token}`, 'x-client-id': `device-${name}` } as Headers };
  };
  /** Books `count` seats side by side at the first Last Light showtime, signed in when `headers` has a token. */
  const book = async (headers: Headers, count = 2) => {
    const own = { ...headers, 'x-client-id': `booking-${++clients}` };
    const { results } = (await app.inject(`/v1/movies/the-last-light/showtimes?count=${count}&arrangement=connected`)).json();
    const { best } = (await app.inject(`/v1/showtimes/${results[0].showtimeId}/seats?count=${count}&arrangement=connected`)).json();
    const hold = (await app.inject({ method: 'POST', url: '/v1/holds', headers: own, payload: { showtimeId: results[0].showtimeId, seats: best.seats } })).json();
    const guest = { name: 'Mona Adel', email: 'mona@example.com', mobile: '+20 100 123 4567' };
    const res = await app.inject({ method: 'POST', url: '/v1/bookings', headers: own, payload: { holdId: hold.id, guest, paymentMethod: 'card', acceptPolicy: true } });
    assert.equal(res.statusCode, 201, res.body);
    return res.json() as { id: string; showtime: { showtimeId: string; startsAt: string; price: number }; tickets: { id: string; seat: string; qr: string; status: string }[] };
  };
  const addPayout = async (headers: Headers) =>
    assert.equal((await app.inject({ method: 'POST', url: '/v1/resale/payout-method', headers, payload: wallet })).statusCode, 200);
  const list = (headers: Headers, bookingId: string, ticketIds: string[], price: number) =>
    app.inject({ method: 'POST', url: '/v1/resale/listings', headers, payload: { bookingId, ticketIds, price } });
  const buy = (headers: Headers, listingId: string, ticketIds: string[]) =>
    app.inject({ method: 'POST', url: `/v1/resale/listings/${listingId}/purchase`, headers, payload: { ticketIds, paymentMethod: 'wallet' } });
  const booking = async (id: string) => (await app.inject(`/v1/bookings/${id}`)).json();
  const statuses = async (id: string) => Object.fromEntries((await booking(id)).tickets.map((t: { seat: string; status: string }) => [t.seat, t.status]));
  const market = async (headers: Headers = {}) => (await app.inject({ url: '/v1/resale/listings', headers })).json();
  const mine = async (headers: Headers) => (await app.inject({ url: '/v1/resale/my-listings', headers })).json();

  const seller = await signUp('Seller');
  const buyer = await signUp('Buyer');
  const tickets = await book(seller.headers);
  await addPayout(seller.headers);
  return {
    app, seller, buyer, tickets, signUp, book, addPayout, list, buy, booking, statuses, market, mine,
    setNow: (t: number) => { now = t; },
  };
}

test('payout details are stored unverified (sandbox) and shown masked', async () => {
  const { app, buyer } = await setup();
  const url = '/v1/resale/payout-method';
  assert.equal((await app.inject({ url })).statusCode, 401);
  assert.deepEqual((await app.inject({ url, headers: buyer.headers })).json(), { payoutMethod: null });
  assert.equal((await app.inject({ method: 'POST', url, headers: buyer.headers, payload: { kind: 'wallet' } })).statusCode, 400);
  assert.equal((await app.inject({ method: 'POST', url, headers: buyer.headers, payload: { kind: 'bank', bankName: 'CIB' } })).statusCode, 400);

  const bank = await app.inject({ method: 'POST', url, headers: buyer.headers,
    payload: { kind: 'bank', bankName: 'CIB', accountName: 'Buyer Person', accountNumber: '1000 2000 3000 4321' } });
  assert.equal(bank.statusCode, 200);
  assert.deepEqual({ ...bank.json().payoutMethod, updatedAt: undefined },
    { kind: 'bank', label: 'CIB · •••• 4321', verification: 'unverified-sandbox', updatedAt: undefined });
  const saved = (await app.inject({ url, headers: buyer.headers })).json().payoutMethod;
  assert.equal(saved.label, 'CIB · •••• 4321');
  assert.equal(JSON.stringify(saved).includes('1000'), false);
});

test('only the signed-in owner of a booking can list, and only after adding payout details', async () => {
  const s = await setup();
  const ids = s.tickets.tickets.map((t) => t.id);
  assert.equal((await s.list({}, s.tickets.id, ids, 100)).statusCode, 401);

  // The buyer hasn't added payout details yet.
  const theirs = await s.book(s.buyer.headers);
  const noPayout = await s.list(s.buyer.headers, theirs.id, theirs.tickets.map((t) => t.id), 100);
  assert.equal(noPayout.statusCode, 409);
  assert.equal(noPayout.json().code, 'payout-required');

  await s.addPayout(s.buyer.headers);
  // Someone else's booking, and a guest booking that belongs to no account.
  assert.equal((await s.list(s.buyer.headers, s.tickets.id, ids, 100)).json().code, 'not-owner');
  const guestBooking = await s.book({});
  assert.equal((await s.list(s.seller.headers, guestBooking.id, guestBooking.tickets.map((t) => t.id), 100)).statusCode, 403);
  // A ticket from another booking.
  const mixed = await s.list(s.seller.headers, s.tickets.id, [ids[0], theirs.tickets[0].id], 100);
  assert.equal(mixed.json().code, 'not-in-booking');
});

test('the price is capped at what the seller paid per ticket, excluding fees; fees are added for the buyer and taken from the seller', async () => {
  const s = await setup();
  const paid = s.tickets.showtime.price; // 180 EGP at VOX
  const [first] = s.tickets.tickets;
  const over = await s.list(s.seller.headers, s.tickets.id, [first.id], paid + 1);
  assert.equal(over.statusCode, 400);
  assert.equal(over.json().code, 'price-cap');
  assert.equal(over.json().maxPrice, paid);
  // The 5 EGP platform fee the seller paid on top doesn't count towards the cap.
  assert.equal((await s.list(s.seller.headers, s.tickets.id, [first.id], paid + 5)).statusCode, 400);

  const res = await s.list(s.seller.headers, s.tickets.id, [first.id], paid);
  assert.equal(res.statusCode, 201);
  const listing = res.json();
  assert.equal(listing.status, 'open');
  assert.equal(listing.buyerPays, paid + 5);
  assert.equal(listing.sellerReceives, paid - 20);
  assert.equal(listing.sellerFee, 20);

  const [offer] = await s.market();
  assert.equal(offer.id, listing.id);
  assert.equal(offer.price, paid);
  assert.equal(offer.fee, 5);
  assert.equal(offer.buyerPays, paid + 5);
  assert.deepEqual(offer.tickets, [{ ticketId: first.id, seat: first.seat }]);
  assert.equal(offer.showtime.movie.title, 'The Last Light');
  assert.equal(offer.sellerAccountId, undefined);
  assert.equal(offer.mine, false);
  assert.equal((await s.market(s.seller.headers))[0].mine, true);
});

test('a subset of tickets can be listed; listed, used and transferred tickets cannot be listed again', async () => {
  const db = await createDb(undefined, 'memory://');
  const s = await setup({ db });
  const [first, second] = s.tickets.tickets;
  assert.equal((await s.list(s.seller.headers, s.tickets.id, [first.id], 150)).statusCode, 201);
  assert.deepEqual(await s.statuses(s.tickets.id), { [first.seat]: 'listed', [second.seat]: 'valid' });

  const again = await s.list(s.seller.headers, s.tickets.id, [first.id, second.id], 150);
  assert.equal(again.statusCode, 409);
  assert.equal(again.json().code, 'ineligible');
  assert.deepEqual(again.json().tickets.map((t: { seat: string }) => t.seat), [first.seat]);
  assert.equal((await s.statuses(s.tickets.id))[second.seat], 'valid');

  // Scanned at the entrance.
  await db.query(`UPDATE tickets SET status = 'used' WHERE id = $1`, [second.id]);
  assert.equal((await s.list(s.seller.headers, s.tickets.id, [second.id], 150)).json().code, 'ineligible');

  // A ticket the seller sold is transferred and can't be listed again.
  const [listing] = await s.mine(s.seller.headers);
  assert.equal((await s.buy(s.buyer.headers, listing.id, [first.id])).statusCode, 201);
  assert.equal((await s.statuses(s.tickets.id))[first.seat], 'transferred');
  assert.equal((await s.list(s.seller.headers, s.tickets.id, [first.id], 150)).json().code, 'ineligible');
});

test('the cinema checks eligibility before a listing is published', async () => {
  const asked: { showtimeId: string; seats: string[] }[] = [];
  let allowed = false;
  const s = await setup({
    cinema: cinemaWith({
      async checkEligibility({ showtimeId, tickets }) {
        asked.push({ showtimeId, seats: tickets.map((t) => t.seat) });
        return allowed ? { ok: true, confirmation: 'ok' } : { ok: false, reason: 'Already scanned' };
      },
    }),
  });
  const ids = s.tickets.tickets.map((t) => t.id);
  const refused = await s.list(s.seller.headers, s.tickets.id, ids, 100);
  assert.equal(refused.statusCode, 409);
  assert.equal(refused.json().code, 'cinema-ineligible');
  assert.deepEqual(asked, [{ showtimeId: s.tickets.showtime.showtimeId, seats: s.tickets.tickets.map((t) => t.seat) }]);
  assert.deepEqual(Object.values(await s.statuses(s.tickets.id)), ['valid', 'valid']);
  assert.deepEqual(await s.market(), []);

  allowed = true;
  assert.equal((await s.list(s.seller.headers, s.tickets.id, ids, 100)).statusCode, 201);
});

test('buying: the buyer pays price + 5 EGP, gets a replacement ticket, the seller’s becomes transferred and their payout is pending', async () => {
  const pay = recordingPayments();
  const transfers: unknown[] = [];
  const s = await setup({ payments: pay.payments, cinema: cinemaWith({ async transfer(input) { transfers.push(input); return { ok: true, confirmation: 'CIN-T1' }; } }) });
  pay.start();
  const [first, second] = s.tickets.tickets;
  const listing = (await s.list(s.seller.headers, s.tickets.id, [first.id, second.id], 150)).json();

  assert.equal((await s.buy({}, listing.id, [first.id])).statusCode, 401);
  const own = await s.buy(s.seller.headers, listing.id, [first.id]);
  assert.equal(own.statusCode, 403);
  assert.equal(own.json().code, 'own-listing');

  const res = await s.buy(s.buyer.headers, listing.id, [first.id, second.id]);
  assert.equal(res.statusCode, 201, res.body);
  const bought = res.json();
  assert.deepEqual(pay.charges, [2 * (150 + 5)]);
  assert.deepEqual(bought.price, { tickets: 300, fees: 10, total: 310 });
  assert.equal(bought.accountId, s.buyer.id);
  assert.equal(bought.holder.email, 'buyer@example.com');
  assert.equal(bought.showtime.price, 150);
  assert.equal(bought.cinemaConfirmation, 'CIN-T1');
  assert.deepEqual(bought.tickets.map((t: { seat: string }) => t.seat).sort(), [first.seat, second.seat].sort());
  assert.ok(bought.tickets.every((t: { status: string; qr: string }) => t.status === 'valid' && t.qr !== first.qr && t.qr !== second.qr));
  assert.equal((transfers[0] as { tickets: { originalQr: string }[] }).tickets.length, 2);

  // The buyer's booking is theirs to view; the seller's tickets are invalidated.
  assert.equal((await s.booking(bought.id)).reference, bought.reference);
  assert.deepEqual(Object.values(await s.statuses(s.tickets.id)), ['transferred', 'transferred']);

  const [sold] = await s.mine(s.seller.headers);
  assert.equal(sold.status, 'sold');
  assert.equal(sold.pendingPayout, 2 * (150 - 20));
  assert.ok(sold.tickets.every((t: { state: string }) => t.state === 'sold'));
  assert.deepEqual(await s.market(), []);
  assert.equal((await s.buy(s.buyer.headers, listing.id, [first.id])).statusCode, 410);

  // The seat stays sold: nobody can hold it again.
  const map = (await s.app.inject(`/v1/showtimes/${s.tickets.showtime.showtimeId}/seats`)).json();
  assert.ok(map.unavailable.includes(first.seat));
  const hold = await s.app.inject({ method: 'POST', url: '/v1/holds', payload: { showtimeId: s.tickets.showtime.showtimeId, seats: [first.seat] } });
  assert.equal(hold.statusCode, 409);

  // The buyer can resell, capped at what they paid on resale.
  await s.addPayout(s.buyer.headers);
  assert.equal((await s.list(s.buyer.headers, bought.id, [bought.tickets[0].id], 151)).json().code, 'price-cap');
  assert.equal((await s.list(s.buyer.headers, bought.id, [bought.tickets[0].id], 150)).statusCode, 201);
});

test('the seller payout is the price less 20 EGP, never below zero', async () => {
  const pay = recordingPayments();
  const s = await setup({ payments: pay.payments });
  pay.start();
  const [first] = s.tickets.tickets;
  const listing = (await s.list(s.seller.headers, s.tickets.id, [first.id], 15)).json();
  assert.equal(listing.sellerReceives, 0);
  assert.equal(listing.buyerPays, 20);
  assert.equal((await s.buy(s.buyer.headers, listing.id, [first.id])).statusCode, 201);
  assert.deepEqual(pay.charges, [20]);
  const [sold] = await s.mine(s.seller.headers);
  assert.equal(sold.pendingPayout, 0);
});

test('only some tickets of a listing can sell; the rest stay for sale and can be withdrawn', async () => {
  const s = await setup();
  const [first, second] = s.tickets.tickets;
  const listing = (await s.list(s.seller.headers, s.tickets.id, [first.id, second.id], 120)).json();
  assert.equal((await s.buy(s.buyer.headers, listing.id, [second.id])).statusCode, 201);
  const [offer] = await s.market();
  assert.deepEqual(offer.tickets.map((t: { seat: string }) => t.seat), [first.seat]);
  assert.equal((await s.mine(s.seller.headers))[0].pendingPayout, 100);

  assert.equal((await s.app.inject({ method: 'DELETE', url: `/v1/resale/listings/${listing.id}`, headers: s.seller.headers })).statusCode, 200);
  assert.deepEqual(await s.statuses(s.tickets.id), { [first.seat]: 'valid', [second.seat]: 'transferred' });
  const [closed] = await s.mine(s.seller.headers);
  assert.equal(closed.status, 'withdrawn');
  assert.equal(closed.pendingPayout, 100);
});

test('the seller can withdraw an unsold listing: the ticket is valid again and can be relisted', async () => {
  const s = await setup();
  const ids = s.tickets.tickets.map((t) => t.id);
  const listing = (await s.list(s.seller.headers, s.tickets.id, ids, 100)).json();
  const url = `/v1/resale/listings/${listing.id}`;
  assert.equal((await s.app.inject({ method: 'DELETE', url })).statusCode, 401);
  assert.equal((await s.app.inject({ method: 'DELETE', url, headers: s.buyer.headers })).statusCode, 404);

  const res = await s.app.inject({ method: 'DELETE', url, headers: s.seller.headers });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().status, 'withdrawn');
  assert.deepEqual(Object.values(await s.statuses(s.tickets.id)), ['valid', 'valid']);
  assert.deepEqual(await s.market(), []);
  assert.equal((await s.buy(s.buyer.headers, listing.id, ids)).statusCode, 410);
  assert.equal((await s.app.inject({ method: 'DELETE', url, headers: s.seller.headers })).statusCode, 409);
  assert.equal((await s.list(s.seller.headers, s.tickets.id, ids, 90)).statusCode, 201);
});

test('listings close when the show starts; the ticket stays blocked until the cinema confirms reactivation', async () => {
  let reactivates = false;
  const asked: string[][] = [];
  const s = await setup({
    cinema: cinemaWith({
      async reactivate({ tickets }) {
        asked.push(tickets.map((t) => t.seat));
        return reactivates ? { ok: true, confirmation: 'R1' } : { ok: false, reason: 'Cinema system offline' };
      },
    }),
  });
  const [first, second] = s.tickets.tickets;
  const listing = (await s.list(s.seller.headers, s.tickets.id, [first.id], 100)).json();
  assert.equal((await s.market()).length, 1);

  const start = Date.parse(s.tickets.showtime.startsAt);
  s.setNow(start - 1000);
  assert.equal((await s.market()).length, 1);
  s.setNow(start);
  assert.deepEqual(await s.market(), []);
  // Closed unsold: neither the seller nor a buyer can use it until the cinema confirms.
  assert.deepEqual(await s.statuses(s.tickets.id), { [first.seat]: 'pending-reactivation', [second.seat]: 'valid' });
  const [expired] = await s.mine(s.seller.headers);
  assert.equal(expired.status, 'expired');
  assert.equal(expired.tickets[0].state, 'expired');
  assert.equal((await s.buy(s.buyer.headers, listing.id, [first.id])).statusCode, 410);
  assert.equal((await s.list(s.seller.headers, s.tickets.id, [second.id], 100)).json().code, 'show-started');

  // Retried at most once a minute until the cinema confirms.
  reactivates = true;
  s.setNow(start + 30_000);
  assert.equal((await s.statuses(s.tickets.id))[first.seat], 'pending-reactivation');
  s.setNow(start + 61_000);
  await eventually(async () => (await s.statuses(s.tickets.id))[first.seat] === 'valid', 'the ticket to be reactivated');
  assert.deepEqual(asked, [[first.seat], [first.seat]]);
});

test('with the sandbox cinema an expired listing’s ticket is reactivated straight away', async () => {
  const s = await setup();
  const [first] = s.tickets.tickets;
  await s.list(s.seller.headers, s.tickets.id, [first.id], 100);
  s.setNow(Date.parse(s.tickets.showtime.startsAt) + 1);
  await eventually(async () => (await s.statuses(s.tickets.id))[first.seat] === 'valid', 'the ticket to be reactivated');
  assert.equal((await s.mine(s.seller.headers))[0].status, 'expired');
});

test('a slow cinema never holds up requests: reactivation runs in the background, one run at a time', async () => {
  let answer!: (result: { ok: true; confirmation: string }) => void;
  let asked = 0;
  const s = await setup({
    cinema: cinemaWith({ reactivate() { asked++; return new Promise((resolve) => { answer = resolve; }); } }),
  });
  const [first] = s.tickets.tickets;
  await s.list(s.seller.headers, s.tickets.id, [first.id], 100);
  const start = Date.parse(s.tickets.showtime.startsAt);
  const quick = <T>(p: Promise<T>) => Promise.race([p, new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('The request waited for the cinema')), 1000).unref();
  })]);

  s.setNow(start);
  // The listing is closed before the response, while the cinema is still being asked.
  assert.equal((await quick(s.statuses(s.tickets.id)))[first.seat], 'pending-reactivation');
  assert.equal((await quick(s.app.inject({ url: '/v1/me', headers: s.seller.headers }))).statusCode, 200);
  await eventually(async () => asked === 1, 'the cinema to be asked');
  // Retries are due, but the first request is still waiting for an answer: no more pile up behind it.
  s.setNow(start + 61_000);
  await quick(s.market());
  s.setNow(start + 122_000);
  await quick(s.mine(s.seller.headers));
  assert.equal(asked, 1);

  answer({ ok: true, confirmation: 'R1' });
  await eventually(async () => (await s.statuses(s.tickets.id))[first.seat] === 'valid', 'the ticket to be reactivated');
  assert.equal(asked, 1);
});

test('a reactivation the cinema never answers times out and is retried on a later sweep', async () => {
  const db = await createDb(undefined, 'memory://');
  let now = MORNING;
  const bookingId = '00000000-0000-4000-8000-000000000002';
  await db.query(
    `INSERT INTO bookings (id, reference, showtime_id, movie_id, cinema_id, starts_at, format, ticket_price, holder, payment_method, price, payment_ref, cinema_confirmation)
     VALUES ($1, 'YL-TEST02', 's1', 'm', 'c', '2026-10-01T19:45:00+03:00', 'Standard', 100, '{}', 'card', '{}', 'p', 'c')`, [bookingId]);
  // A ticket from a listing that closed unsold.
  await db.query(`INSERT INTO tickets (id, booking_id, showtime_id, seat, qr, status) VALUES ($1, $2, 's1', 'D7', 'YALLA:D7', 'pending-reactivation')`,
    ['00000000-0000-4000-8000-00000000000d', bookingId]);
  let asked = 0;
  const warnings: { reason: string }[] = [];
  const log = { warn: (o: { reason: string }) => warnings.push(o), error: (e: unknown) => assert.fail(String(e)) } as unknown as FastifyBaseLogger;
  const cinema = cinemaWith({ reactivate() { asked++; return new Promise(() => {}); } });
  const sweep = resaleSweep(new Resale(db, () => now), cinema, log, { reactivateTimeoutMs: 20 });
  const req = { url: '/v1/me' } as FastifyRequest;

  await sweep(req);
  await eventually(async () => warnings.length === 1, 'the reactivation to time out');
  assert.equal(asked, 1);
  assert.match(warnings[0].reason, /No answer after 20 ms/);
  now += 61_000;
  await sweep(req);
  await eventually(async () => asked === 2, 'a retry');
  await db.close();
});

test('if the cinema cannot transfer the ticket, the buyer is refunded and the seller keeps a valid ticket', async () => {
  const pay = recordingPayments();
  const s = await setup({ payments: pay.payments, cinema: cinemaWith({ async transfer() { return { ok: false, reason: 'Cinema system offline' }; } }) });
  pay.start(async () => ({ ok: true, paymentRef: 'pay-1' }));
  const [first] = s.tickets.tickets;
  const listing = (await s.list(s.seller.headers, s.tickets.id, [first.id], 100)).json();
  const res = await s.buy(s.buyer.headers, listing.id, [first.id]);
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, 'transfer-failed');
  assert.deepEqual(pay.charges, [105]);
  assert.deepEqual(pay.refunds, ['pay-1']);
  assert.equal((await s.statuses(s.tickets.id))[first.seat], 'valid');
  const [closed] = await s.mine(s.seller.headers);
  assert.equal(closed.status, 'closed');
  assert.equal(closed.pendingPayout, 0);
  assert.equal(closed.tickets[0].state, 'returned');
  assert.deepEqual(await s.market(), []);
});

test('a refund that fails is recorded for support, not as a refund, and the buyer is told', async () => {
  const db = await createDb(undefined, 'memory://');
  const log = errorLog();
  const pay = recordingPayments();
  const payments: PaymentProvider = { charge: pay.payments.charge, async refund() { throw new Error('Payment provider timeout'); } };
  const s = await setup({ db, payments, logger: log.logger, cinema: cinemaWith({ async transfer() { return { ok: false, reason: 'Cinema system offline' }; } }) });
  pay.start(async () => ({ ok: true, paymentRef: 'pay-1' }));
  const [first] = s.tickets.tickets;
  const listing = (await s.list(s.seller.headers, s.tickets.id, [first.id], 100)).json();

  const res = await s.buy(s.buyer.headers, listing.id, [first.id]);
  assert.equal(res.statusCode, 502);
  assert.equal(res.json().code, 'refund-failed');
  const { rows: [sale] } = await db.query<{ status: string; payment_ref: string; reference: string }>('SELECT status, payment_ref, reference FROM resale_sales');
  assert.deepEqual({ ...sale }, { status: 'refund-failed', payment_ref: 'pay-1', reference: res.json().reference });
  assert.ok(log.errors.some((e) => e.paymentRef === 'pay-1' && /refund/i.test(e.msg)));
  // The cinema transferred nothing, so the seller's ticket still works.
  assert.equal((await s.statuses(s.tickets.id))[first.seat], 'valid');
  assert.equal((await s.mine(s.seller.headers))[0].tickets[0].state, 'returned');
});

test('a failed payment puts the tickets back on sale', async () => {
  let declines = true;
  const pay = recordingPayments();
  const s = await setup({ payments: pay.payments });
  pay.start(async (input) => (declines ? { ok: false, reason: 'declined' } : sandboxPayments.charge(input)));
  const [first] = s.tickets.tickets;
  const listing = (await s.list(s.seller.headers, s.tickets.id, [first.id], 100)).json();
  const res = await s.buy(s.buyer.headers, listing.id, [first.id]);
  assert.equal(res.statusCode, 402);
  assert.equal(res.json().code, 'payment-failed');
  assert.equal((await s.market()).length, 1);
  assert.equal((await s.statuses(s.tickets.id))[first.seat], 'listed');
  declines = false;
  assert.equal((await s.buy(s.buyer.headers, listing.id, [first.id])).statusCode, 201);
});

test('two buyers racing for the same ticket: exactly one gets it and only that one is charged', async () => {
  // Payment takes a moment, so every purchase is in flight at once.
  const pay = recordingPayments();
  const s = await setup({ payments: pay.payments });
  pay.start(async (input) => {
    await new Promise((r) => setTimeout(r, 50));
    return sandboxPayments.charge(input);
  });
  const [first] = s.tickets.tickets;
  const listing = (await s.list(s.seller.headers, s.tickets.id, [first.id], 100)).json();
  const buyers = [s.buyer, await s.signUp('Second'), await s.signUp('Third')];
  const results = await Promise.all(buyers.map((b) => s.buy(b.headers, listing.id, [first.id])));
  assert.deepEqual(results.map((r) => r.statusCode).sort(), [201, 409, 409]);
  assert.ok(results.filter((r) => r.statusCode === 409).every((r) => r.json().code === 'unavailable'));
  assert.equal(pay.charges.length, 1);
  assert.equal((await s.statuses(s.tickets.id))[first.seat], 'transferred');
  assert.equal((await s.mine(s.seller.headers))[0].pendingPayout, 80);
});

test('a purchase that never finishes gives its tickets back after 10 minutes', async () => {
  const pay = recordingPayments();
  const s = await setup({ payments: pay.payments });
  pay.start(async () => { throw new Error('Payment provider unreachable'); });
  const [first] = s.tickets.tickets;
  const listing = (await s.list(s.seller.headers, s.tickets.id, [first.id], 100)).json();
  assert.equal((await s.buy(s.buyer.headers, listing.id, [first.id])).statusCode, 500);
  assert.deepEqual(await s.market(), []);
  s.setNow(MORNING + 10 * 60 * 1000 + 1);
  assert.deepEqual((await s.market())[0].tickets.map((t: { seat: string }) => t.seat), [first.seat]);
});

test('a seat is unique among tickets in use, and the schema can be applied again', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'yalla-resale-db-'));
  try {
    await (await createDb(undefined, dir)).close();
    const db = await createDb(undefined, dir); // Applies every schema file a second time.
    const bookingId = '00000000-0000-4000-8000-000000000001';
    await db.query(
      `INSERT INTO bookings (id, reference, showtime_id, movie_id, cinema_id, starts_at, format, ticket_price, holder, payment_method, price, payment_ref, cinema_confirmation)
       VALUES ($1, 'YL-TEST01', 's1', 'm', 'c', '2026-10-01T19:45:00+03:00', 'Standard', 100, '{}', 'card', '{}', 'p', 'c')`, [bookingId]);
    const ticket = (id: string, status: string) =>
      db.query(`INSERT INTO tickets (id, booking_id, showtime_id, seat, qr, status) VALUES ($1, $2, 's1', 'D7', $4, $3)`, [id, bookingId, status, `YALLA:${id}`]);
    await ticket('00000000-0000-4000-8000-00000000000a', 'transferred');
    await ticket('00000000-0000-4000-8000-00000000000b', 'valid');
    await assert.rejects(ticket('00000000-0000-4000-8000-00000000000c', 'listed'), isUniqueViolation);
    await db.close();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('resale follows the cinema’s corrections: a moved show sells at its new time, a cancelled one is off sale', async () => {
  const s = await setup();
  const [first, second] = s.tickets.tickets.map((t) => t.id);
  const { showtime } = await s.booking(s.tickets.id);
  const signIn = await s.app.inject({ method: 'POST', url: '/v1/auth/sign-in',
    payload: { email: demoStaffEmail(showtime.cinema.id), password: DEMO_STAFF_PASSWORD } });
  const staff = { authorization: `Bearer ${signIn.json().token}` };
  const correct = async (payload: Record<string, unknown>) =>
    assert.equal((await s.app.inject({ method: 'PATCH', url: `/v1/operator/showtimes/${showtime.showtimeId}`, headers: staff, payload })).statusCode, 200);

  const moved = await s.list(s.seller.headers, s.tickets.id, [first], 100);
  assert.equal(moved.statusCode, 201, moved.body);
  await correct({ time: '21:10' });
  // After the show's original start, before its new one: still on sale.
  s.setNow(Date.parse(`${showtime.startsAt.slice(0, 10)}T18:00:00+03:00`));
  assert.equal((await s.market())[0].showtime.localTime, '21:10');
  const bought = await s.buy(s.buyer.headers, moved.json().id, [first]);
  assert.equal(bought.statusCode, 201, bought.body);
  assert.equal(bought.json().showtime.localTime, '21:10');
  // The buyer bought the show as it is now, so there is nothing to tell them.
  assert.equal((await s.booking(bought.json().id)).showChange, null);

  const cancelled = await s.list(s.seller.headers, s.tickets.id, [second], 100);
  assert.equal(cancelled.statusCode, 201, cancelled.body);
  await correct({ cancelled: true });
  assert.deepEqual(await s.market(), []);
  assert.equal((await s.app.inject(`/v1/resale/listings/${cancelled.json().id}`)).statusCode, 410);
  assert.equal((await s.buy(s.buyer.headers, cancelled.json().id, [second])).statusCode, 410);
  assert.equal((await s.app.inject({ method: 'DELETE', url: `/v1/resale/listings/${cancelled.json().id}`, headers: s.seller.headers })).statusCode, 200);
  const relist = await s.list(s.seller.headers, s.tickets.id, [second], 100);
  assert.equal(relist.statusCode, 409);
  assert.equal(relist.json().code, 'show-cancelled');
});
