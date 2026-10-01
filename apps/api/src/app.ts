import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { createDb, type Db } from './db/index.ts';
import { Store } from './data/store.ts';
import { catalogRoutes } from './routes/catalog.ts';
import { bookingRoutes } from './routes/booking.ts';
import { sandboxCinema, type CinemaIntegration } from './integrations/cinema.ts';
import { sandboxPayments, type PaymentProvider } from './integrations/payments.ts';

type Options = { db?: Db; clock?: () => number; payments?: PaymentProvider; cinema?: CinemaIntegration; logger?: boolean; trustProxy?: boolean };

/** Without a `db`, uses a fresh in-memory database (tests). server.ts passes the configured one. */
export async function buildApp({
  db, clock, payments = sandboxPayments, cinema = sandboxCinema, logger = false,
  // Behind a load balancer set TRUST_PROXY=1 so rate limits see the real client address.
  trustProxy = process.env.TRUST_PROXY === '1',
}: Options = {}) {
  const database = db ?? (await createDb(undefined, 'memory://'));
  const store = new Store(database, clock);
  const app = Fastify({ logger, trustProxy });
  app.addHook('onClose', () => database.close());
  await app.register(cors, { origin: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'Accept-Language', 'X-Client-Id'] });
  // Only routes that opt in (config.rateLimit) are limited.
  await app.register(rateLimit, { global: false });
  app.get('/health', async () => ({ ok: true }));
  await app.register(catalogRoutes, { store });
  await app.register(bookingRoutes, { store, payments, cinema });
  return app;
}
