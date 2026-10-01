import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Account, Accounts } from './data/accounts.ts';

export type Auth = ReturnType<typeof authFor>;

/** The session token from `Authorization: Bearer <token>`, if any. */
export const bearerToken = (req: FastifyRequest) => /^Bearer ([A-Za-z0-9_-]{20,100})$/.exec(req.headers.authorization ?? '')?.[1];

/**
 * Who is signed in. Routes use `auth.accountOf(req)` for optional sign-in, or `preHandler: auth.requireAccount`
 * (401 unless signed in) and `auth.requireOperator` (also 403 unless cinema staff) for protected routes.
 */
export function authFor(accounts: Accounts) {
  const seen = new WeakMap<FastifyRequest, Promise<Account | null>>();
  const accountOf = (req: FastifyRequest): Promise<Account | null> => {
    let found = seen.get(req);
    if (!found) {
      const token = bearerToken(req);
      found = token ? accounts.forToken(token) : Promise.resolve(null);
      seen.set(req, found);
    }
    return found;
  };
  return {
    accountOf,
    /** Like accountOf, for handlers behind requireAccount or requireOperator. */
    async account(req: FastifyRequest): Promise<Account> {
      const account = await accountOf(req);
      if (!account) throw new Error('auth.account() used on a route without requireAccount');
      return account;
    },
    async requireAccount(req: FastifyRequest, reply: FastifyReply) {
      if (!(await accountOf(req))) return reply.code(401).send({ error: 'Please sign in.' });
    },
    async requireOperator(req: FastifyRequest, reply: FastifyReply) {
      const account = await accountOf(req);
      if (!account) return reply.code(401).send({ error: 'Please sign in.' });
      if (account.role !== 'operator' || !account.cinemaId) return reply.code(403).send({ error: 'Only cinema staff can do this.' });
    },
  };
}
