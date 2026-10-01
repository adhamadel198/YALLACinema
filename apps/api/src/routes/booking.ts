import { randomInt, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Auth } from '../auth.ts';
import type { Accounts } from '../data/accounts.ts';
import type { Store } from '../data/store.ts';
import { bookingView, showtimeSummary, snapshotOf } from '../data/views.ts';
import { langOf } from '../data/i18n.ts';
import { MAX_SEATS_PER_BOOKING } from '../domain/limits.ts';
import { bookingTotal } from '../domain/pricing.ts';
import { isSeat } from '../domain/seats.ts';
import { emailSchema, mobileSchema, nameSchema } from './schemas.ts';
import type { Booking, Guest, PaymentMethod } from '../domain/types.ts';
import type { CinemaIntegration } from '../integrations/cinema.ts';
import type { PaymentProvider } from '../integrations/payments.ts';

/** Short code printed on the ticket, e.g. YL-K7Q2M9. */
const bookingReference = () =>
  'YL-' + Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');

type Deps = { store: Store; payments: PaymentProvider; cinema: CinemaIntegration; accounts: Accounts; auth: Auth };

/**
 * Who is checking out. The app sends a random per-install id (X-Client-Id); without it, the IP address.
 * Not an identity, only a key for "one checkout at a time" and rate limits until accounts exist.
 */
export const clientIdOf = (req: FastifyRequest) => {
  const header = req.headers['x-client-id'];
  return typeof header === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(header) ? `app:${header}` : `ip:${req.ip}`;
};

const limit = (max: number) => ({ rateLimit: { max, timeWindow: '10 minutes', keyGenerator: clientIdOf } });

export async function bookingRoutes(app: FastifyInstance, { store, payments, cinema, auth }: Deps) {
  /** Recheck and hold the exact seats before payment (BRD 7.2). Replaces this client's previous hold. */
  app.post<{ Body: { showtimeId: string; seats: string[] } }>('/v1/holds', {
    config: limit(30),
    schema: {
      body: {
        type: 'object', required: ['showtimeId', 'seats'],
        properties: {
          showtimeId: { type: 'string' },
          seats: { type: 'array', minItems: 1, maxItems: MAX_SEATS_PER_BOOKING, uniqueItems: true, items: { type: 'string', pattern: '^[A-Z]\\d{1,2}$' } },
        },
      },
    },
  }, async (req, reply) => {
    const showtime = store.showtime(req.body.showtimeId);
    if (!showtime) return reply.code(404).send({ error: 'Showtime not found' });
    // The customer may pick any seats (BRD 7.2), but only real ones: "A13" in a 12-seat row, or "A01" for "A1", is refused.
    const unknown = req.body.seats.filter((s) => !isSeat(showtime.seatMap, s));
    if (unknown.length) return reply.code(400).send({ error: 'These seats are not on this showtime’s seat map', unknown });
    const result = await store.hold(showtime.id, req.body.seats, clientIdOf(req));
    if ('unavailable' in result) return reply.code(409).send({ error: 'Seats no longer available', unavailable: result.unavailable });
    return reply.code(201).send({ ...result.hold, price: bookingTotal(showtime.price, req.body.seats.length) });
  });

  /** Hold details for the checkout screen: seats, price breakdown, expiry and the cinema's policy. */
  app.get<{ Params: { id: string } }>('/v1/holds/:id', { schema: { params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } } } }, async (req, reply) => {
    const hold = await store.getHold(req.params.id);
    const showtime = hold && store.showtime(hold.showtimeId);
    if (!hold || !showtime) return reply.code(410).send({ error: 'Hold expired or not found' });
    return { ...hold, showtime: showtimeSummary(store, snapshotOf(showtime), langOf(req)), price: bookingTotal(showtime.price, hold.seats.length) };
  });

  app.delete<{ Params: { id: string } }>('/v1/holds/:id', { schema: { params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } } } }, async (req, reply) =>
    (await store.release(req.params.id)) ? reply.code(204).send() : reply.code(404).send({ error: 'Hold not found' }));

  /**
   * Pay for held seats and issue tickets (BRD 6, 7.2, 7.4). A booking succeeds only once payment is
   * captured and the cinema confirms; if confirmation fails the payment is refunded and the hold released.
   */
  app.post<{ Body: { holdId: string; guest: Guest; paymentMethod: PaymentMethod; acceptPolicy: true } }>('/v1/bookings', {
    config: limit(20),
    schema: {
      body: {
        type: 'object', required: ['holdId', 'guest', 'paymentMethod', 'acceptPolicy'],
        properties: {
          holdId: { type: 'string', format: 'uuid' },
          guest: {
            type: 'object', required: ['name', 'email', 'mobile'],
            properties: { name: nameSchema, email: emailSchema, mobile: mobileSchema },
          },
          paymentMethod: { type: 'string', enum: ['card', 'wallet'] },
          acceptPolicy: { const: true },
        },
      },
    },
  }, async (req, reply) => {
    const hold = await store.getHold(req.body.holdId);
    const showtime = hold && store.showtime(hold.showtimeId);
    if (!hold || !showtime) return reply.code(410).send({ error: 'Your seat hold expired. Please choose seats again.' });
    const price = bookingTotal(showtime.price, hold.seats.length);
    const reference = bookingReference();

    const charge = await payments.charge({ amount: price.total, currency: 'EGP', method: req.body.paymentMethod, reference });
    if (!charge.ok) {
      await store.release(hold.id);
      return reply.code(402).send({ error: 'Payment failed. Your seats were released.', reason: charge.reason });
    }

    const refund = async () => {
      await payments.refund(charge.paymentRef);
      await store.release(hold.id);
      return reply.code(409).send({ error: 'The cinema could not confirm these seats. You have been refunded.' });
    };
    const confirmation = await cinema.confirm({ showtimeId: showtime.id, seats: hold.seats, reference });
    if (!confirmation.ok) return refund();

    const booking: Booking = {
      id: randomUUID(), reference, showtime: snapshotOf(showtime), holder: req.body.guest,
      accountId: (await auth.accountOf(req))?.id ?? null, paymentMethod: req.body.paymentMethod,
      price, paymentRef: charge.paymentRef, cinemaConfirmation: confirmation.confirmation,
      tickets: hold.seats.map((seat) => ({ id: randomUUID(), seat, qr: `YALLA:${reference}:${seat}`, status: 'valid' })),
      createdAt: new Date().toISOString(),
    };
    // The hold can expire while the customer is paying; then the seats may already be someone else's.
    if (!(await store.saveBooking(hold.id, booking))) return refund();
    // TODO: email the ticket once an email provider is chosen (BRD 6 step 9).
    return reply.code(201).send(bookingView(store, booking, langOf(req)));
  });

  // The booking id is an unguessable UUID and acts as the guest's access key until accounts exist.
  app.get<{ Params: { id: string } }>('/v1/bookings/:id', { schema: { params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } } } }, async (req, reply) => {
    const booking = await store.booking(req.params.id);
    return booking ? bookingView(store, booking, langOf(req)) : reply.code(404).send({ error: 'Booking not found' });
  });
}
