import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Store } from '../data/store.ts';
import { bookingView, showtimeSummary } from '../data/views.ts';
import { langOf } from '../data/i18n.ts';
import { bookingTotal } from '../domain/pricing.ts';
import type { Booking, Guest, PaymentMethod } from '../domain/types.ts';
import type { CinemaIntegration } from '../integrations/cinema.ts';
import type { PaymentProvider } from '../integrations/payments.ts';

const notYet = (reply: FastifyReply, what: string) =>
  reply.code(501).send({ error: `${what} is not implemented yet`, see: 'apps/api/README.md' });

/** Short code printed on the ticket, e.g. YL-K7Q2M9. */
const bookingReference = () =>
  'YL-' + Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

type Deps = { store: Store; payments: PaymentProvider; cinema: CinemaIntegration };

export async function bookingRoutes(app: FastifyInstance, { store, payments, cinema }: Deps) {
  /** Recheck and hold the exact seats before payment (BRD 7.2). */
  app.post<{ Body: { showtimeId: string; seats: string[] } }>('/v1/holds', {
    schema: {
      body: {
        type: 'object', required: ['showtimeId', 'seats'],
        properties: {
          showtimeId: { type: 'string' },
          seats: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', pattern: '^[A-Z]\\d{1,2}$' } },
        },
      },
    },
  }, async (req, reply) => {
    const showtime = store.showtime(req.body.showtimeId);
    if (!showtime) return reply.code(404).send({ error: 'Showtime not found' });
    const result = store.hold(showtime.id, req.body.seats);
    if ('unavailable' in result) return reply.code(409).send({ error: 'Seats no longer available', unavailable: result.unavailable });
    return reply.code(201).send({ ...result.hold, price: bookingTotal(showtime.price, req.body.seats.length) });
  });

  /** Hold details for the checkout screen: seats, price breakdown, expiry and the cinema's policy. */
  app.get<{ Params: { id: string } }>('/v1/holds/:id', async (req, reply) => {
    const hold = store.getHold(req.params.id);
    if (!hold) return reply.code(410).send({ error: 'Hold expired or not found' });
    const showtime = showtimeSummary(store, hold.showtimeId, langOf(req));
    return { ...hold, showtime, price: bookingTotal(showtime.price, hold.seats.length) };
  });

  app.delete<{ Params: { id: string } }>('/v1/holds/:id', async (req, reply) =>
    store.release(req.params.id) ? reply.code(204).send() : reply.code(404).send({ error: 'Hold not found' }));

  /**
   * Pay for held seats and issue tickets (BRD 6, 7.2, 7.4). A booking succeeds only once payment is
   * captured and the cinema confirms; if confirmation fails the payment is refunded and the hold released.
   */
  app.post<{ Body: { holdId: string; guest: Guest; paymentMethod: PaymentMethod; acceptPolicy: true } }>('/v1/bookings', {
    schema: {
      body: {
        type: 'object', required: ['holdId', 'guest', 'paymentMethod', 'acceptPolicy'],
        properties: {
          holdId: { type: 'string' },
          guest: {
            type: 'object', required: ['name', 'email', 'mobile'],
            properties: {
              name: { type: 'string', minLength: 2, maxLength: 100 },
              email: { type: 'string', pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$', maxLength: 200 },
              mobile: { type: 'string', pattern: '^\\+?[0-9 ]{8,16}$' },
            },
          },
          paymentMethod: { type: 'string', enum: ['card', 'wallet'] },
          acceptPolicy: { const: true },
        },
      },
    },
  }, async (req, reply) => {
    const hold = store.getHold(req.body.holdId);
    if (!hold) return reply.code(410).send({ error: 'Your seat hold expired. Please choose seats again.' });
    const showtime = store.showtime(hold.showtimeId)!;
    const price = bookingTotal(showtime.price, hold.seats.length);
    const reference = bookingReference();

    const charge = await payments.charge({ amount: price.total, currency: 'EGP', method: req.body.paymentMethod, reference });
    if (!charge.ok) {
      store.release(hold.id);
      return reply.code(402).send({ error: 'Payment failed. Your seats were released.', reason: charge.reason });
    }

    const confirmation = await cinema.confirm({ showtimeId: showtime.id, seats: hold.seats, reference });
    if (!confirmation.ok || !store.getHold(hold.id)) {
      await payments.refund(charge.paymentRef);
      store.release(hold.id);
      return reply.code(409).send({ error: 'The cinema could not confirm these seats. You have been refunded.' });
    }

    const booking: Booking = {
      id: randomUUID(), reference, showtimeId: showtime.id, holder: req.body.guest, paymentMethod: req.body.paymentMethod,
      price, paymentRef: charge.paymentRef, cinemaConfirmation: confirmation.confirmation,
      tickets: hold.seats.map((seat) => ({ id: randomUUID(), seat, qr: `YALLA:${reference}:${seat}`, status: 'valid' })),
      createdAt: new Date().toISOString(),
    };
    store.saveBooking(hold.id, booking);
    // TODO: email the ticket once an email provider is chosen (BRD 6 step 9).
    return reply.code(201).send(bookingView(store, booking, langOf(req)));
  });

  // The booking id is an unguessable UUID and acts as the guest's access key until accounts exist.
  app.get<{ Params: { id: string } }>('/v1/bookings/:id', async (req, reply) => {
    const booking = store.booking(req.params.id);
    return booking ? bookingView(store, booking, langOf(req)) : reply.code(404).send({ error: 'Booking not found' });
  });

  // Accounts are optional for booking but required for resale (BRD 7.3, 11).
  app.post('/v1/auth/sign-in', async (_req, reply) => notYet(reply, 'Sign-in'));
  app.get('/v1/me', async (_req, reply) => notYet(reply, 'Accounts'));

  // Resale marketplace (BRD 11). Pricing rules live in src/domain/pricing.ts.
  app.get('/v1/resale/listings', async (_req, reply) => notYet(reply, 'Resale marketplace'));
  app.post('/v1/resale/listings', async (_req, reply) => notYet(reply, 'Resale listing'));
  app.delete('/v1/resale/listings/:id', async (_req, reply) => notYet(reply, 'Resale withdrawal'));
  app.post('/v1/resale/listings/:id/purchase', async (_req, reply) => notYet(reply, 'Resale purchase'));

  // Cinema operator portal (BRD 7.5).
  app.get('/v1/operator/bookings', async (_req, reply) => notYet(reply, 'Operator bookings'));
  app.patch('/v1/operator/showtimes/:id', async (_req, reply) => notYet(reply, 'Operator listing correction'));
}
