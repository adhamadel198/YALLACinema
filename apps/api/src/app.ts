import Fastify, { type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { createDb, type Db } from './db/index.ts';
import { Store } from './data/store.ts';
import { catalogRoutes } from './routes/catalog.ts';
import { bookingRoutes } from './routes/booking.ts';
import { accountRoutes } from './routes/accounts.ts';
import { resaleRoutes, resaleSweep } from './routes/resale.ts';
import { operatorRoutes } from './routes/operator.ts';
import { Accounts } from './data/accounts.ts';
import { Corrections } from './data/operator.ts';
import { Resale } from './data/resale.ts';
import { authFor } from './auth.ts';
import { sandboxCinema, type CinemaIntegration } from './integrations/cinema.ts';
import { sandboxPayments, type PaymentProvider } from './integrations/payments.ts';

type Options = { db?: Db; clock?: () => number; payments?: PaymentProvider; cinema?: CinemaIntegration; logger?: FastifyServerOptions['logger']; trustProxy?: boolean };

/** Without a `db`, uses a fresh in-memory database (tests). server.ts passes the configured one. */
export async function buildApp({
  db, clock, payments = sandboxPayments, cinema = sandboxCinema, logger = false,
  // Behind a load balancer set TRUST_PROXY=1 so rate limits see the real client address.
  trustProxy = process.env.TRUST_PROXY === '1',
}: Options = {}) {
  const database = db ?? (await createDb(undefined, 'memory://'));
  const corrections = new Corrections(database, clock);
  const store = new Store(database, clock, corrections);
  const accounts = new Accounts(database, clock);
  const auth = authFor(accounts);
  const resale = new Resale(database, clock);
  const app = Fastify({ logger, trustProxy });
  app.addHook('onClose', () => database.close());
  await app.register(cors, { origin: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'Accept-Language', 'X-Client-Id', 'Authorization'] });
  // Only routes that opt in (config.rateLimit) are limited.
  await app.register(rateLimit, { global: false });
  // Staff corrections to listings (data/operator.ts) live in the database. Reload them for every API request,
  // so that with several API instances running each one serves the listings the database holds.
  app.addHook('onRequest', async (req) => { if (req.method !== 'OPTIONS' && req.url.startsWith('/v1/')) await corrections.refresh(); });
  app.get('/health', async () => ({ ok: true }));
  // Resale listings close when their show starts; checked before requests that show tickets (BRD 11).
  app.addHook('preHandler', resaleSweep(resale, cinema, app.log));
  await app.register(catalogRoutes, { store });
  await app.register(bookingRoutes, { store, payments, cinema, accounts, auth });
  await app.register(accountRoutes, { store, accounts, auth });
  await app.register(resaleRoutes, { store, accounts, auth, payments, cinema, resale });
  await app.register(operatorRoutes, { store, accounts, auth, corrections });
  return app;
}
