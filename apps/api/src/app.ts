import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Store } from './data/store.ts';
import { catalogRoutes } from './routes/catalog.ts';
import { bookingRoutes } from './routes/booking.ts';

export async function buildApp({ store = new Store(), logger = false } = {}) {
  const app = Fastify({ logger });
  await app.register(cors, { origin: true });
  app.get('/health', async () => ({ ok: true }));
  await app.register(catalogRoutes, { store });
  await app.register(bookingRoutes, { store });
  return app;
}
