import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Store } from '../data/store.ts';
import { bookingTotal } from '../domain/pricing.ts';

const notYet = (reply: FastifyReply, what: string) =>
  reply.code(501).send({ error: `${what} is not implemented yet`, see: 'apps/api/README.md' });

export async function bookingRoutes(app: FastifyInstance, { store }: { store: Store }) {
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

  app.delete<{ Params: { id: string } }>('/v1/holds/:id', async (req, reply) =>
    store.release(req.params.id) ? reply.code(204).send() : reply.code(404).send({ error: 'Hold not found' }));

  // Payment capture + cinema confirmation, then ticket issue (BRD 6, 7.2, 7.4).
  app.post('/v1/bookings', async (_req, reply) => notYet(reply, 'Booking and payment'));
  app.get('/v1/bookings/:id', async (_req, reply) => notYet(reply, 'Booking lookup'));
  app.get('/v1/bookings/:id/tickets', async (_req, reply) => notYet(reply, 'Ticket issue'));

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
