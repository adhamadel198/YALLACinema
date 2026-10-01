import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Auth } from '../auth.ts';
import type { Accounts } from '../data/accounts.ts';
import type { Store } from '../data/store.ts';

type Deps = { store: Store; accounts: Accounts; auth: Auth };

const notYet = (reply: FastifyReply, what: string) =>
  reply.code(501).send({ error: `${what} is not implemented yet`, see: 'apps/api/README.md' });

/** Cinema operator portal (BRD 7.5): staff of one cinema see its bookings and correct its listings. */
export async function operatorRoutes(app: FastifyInstance, _deps: Deps) {
  app.get('/v1/operator/bookings', async (_req, reply) => notYet(reply, 'Operator bookings'));
  app.patch('/v1/operator/showtimes/:id', async (_req, reply) => notYet(reply, 'Operator listing correction'));
}
