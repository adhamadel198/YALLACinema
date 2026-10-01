import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Auth } from '../auth.ts';
import type { Accounts } from '../data/accounts.ts';
import type { Store } from '../data/store.ts';
import type { PaymentProvider } from '../integrations/payments.ts';
import type { CinemaIntegration } from '../integrations/cinema.ts';

type Deps = { store: Store; accounts: Accounts; auth: Auth; payments: PaymentProvider; cinema: CinemaIntegration };

const notYet = (reply: FastifyReply, what: string) =>
  reply.code(501).send({ error: `${what} is not implemented yet`, see: 'apps/api/README.md' });

/** Resale marketplace (BRD 11). Pricing rules live in src/domain/pricing.ts. */
export async function resaleRoutes(app: FastifyInstance, _deps: Deps) {
  app.get('/v1/resale/listings', async (_req, reply) => notYet(reply, 'Resale marketplace'));
  app.post('/v1/resale/listings', async (_req, reply) => notYet(reply, 'Resale listing'));
  app.delete('/v1/resale/listings/:id', async (_req, reply) => notYet(reply, 'Resale withdrawal'));
  app.post('/v1/resale/listings/:id/purchase', async (_req, reply) => notYet(reply, 'Resale purchase'));
}
