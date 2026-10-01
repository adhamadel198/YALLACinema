import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Store } from './data/store.ts';
import { catalogRoutes } from './routes/catalog.ts';
import { bookingRoutes } from './routes/booking.ts';
import { sandboxCinema, type CinemaIntegration } from './integrations/cinema.ts';
import { sandboxPayments, type PaymentProvider } from './integrations/payments.ts';

type Options = { store?: Store; payments?: PaymentProvider; cinema?: CinemaIntegration; logger?: boolean };

export async function buildApp({ store = new Store(), payments = sandboxPayments, cinema = sandboxCinema, logger = false }: Options = {}) {
  const app = Fastify({ logger });
  await app.register(cors, { origin: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'] });
  app.get('/health', async () => ({ ok: true }));
  await app.register(catalogRoutes, { store });
  await app.register(bookingRoutes, { store, payments, cinema });
  return app;
}
