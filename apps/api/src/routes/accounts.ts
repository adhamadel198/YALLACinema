import type { FastifyInstance } from 'fastify';
import { bearerToken, type Auth } from '../auth.ts';
import type { Account, Accounts } from '../data/accounts.ts';
import type { Store } from '../data/store.ts';
import { bookingView } from '../data/views.ts';
import { langOf } from '../data/i18n.ts';
import { clientIdOf } from './booking.ts';
import { emailSchema, mobileSchema, nameSchema } from './schemas.ts';

type Deps = { store: Store; accounts: Accounts; auth: Auth };

const limit = (max: number) => ({ rateLimit: { max, timeWindow: '10 minutes', keyGenerator: clientIdOf } });
const signedIn = (token: string, account: Account) => ({ token, account });

/**
 * Accounts are optional for booking but required for resale and the operator portal (BRD 7.3, 7.5, 11).
 * Signed in, a customer gets booking history and saved details (BRD 5.1).
 */
export async function accountRoutes(app: FastifyInstance, { store, accounts, auth }: Deps) {
  app.post<{ Body: { name: string; email: string; mobile: string; password: string } }>('/v1/auth/sign-up', {
    config: limit(10),
    schema: {
      body: {
        type: 'object', required: ['name', 'email', 'mobile', 'password'],
        properties: { name: nameSchema, email: emailSchema, mobile: mobileSchema, password: { type: 'string', minLength: 8, maxLength: 200 } },
      },
    },
  }, async (req, reply) => {
    const account = await accounts.create(req.body);
    if (!account) return reply.code(409).send({ error: 'An account with this email already exists. Sign in instead.' });
    return reply.code(201).send(signedIn(await accounts.startSession(account.id), account));
  });

  app.post<{ Body: { email: string; password: string } }>('/v1/auth/sign-in', {
    config: limit(10),
    schema: {
      body: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', maxLength: 200 }, password: { type: 'string', maxLength: 200 } } },
    },
  }, async (req, reply) => {
    const account = await accounts.verify(req.body.email, req.body.password);
    if (!account) return reply.code(401).send({ error: 'Wrong email or password.' });
    return signedIn(await accounts.startSession(account.id), account);
  });

  app.post('/v1/auth/sign-out', async (req, reply) => {
    const token = bearerToken(req);
    if (token) await accounts.endSession(token);
    return reply.code(204).send();
  });

  app.get('/v1/me', { preHandler: auth.requireAccount }, async (req) => auth.account(req));

  /** Booking history: the account's bookings, newest first, each shaped like GET /v1/bookings/:id. */
  app.get('/v1/me/bookings', { preHandler: auth.requireAccount }, async (req) => {
    const ids = await accounts.bookingIds((await auth.account(req)).id);
    const found = await Promise.all(ids.map((id) => store.booking(id)));
    const lang = langOf(req);
    return found.filter((b) => b !== undefined).map((b) => bookingView(store, b, lang));
  });

  /**
   * Attach guest bookings saved on this device to the account (the app calls this after sign-in).
   * Knowing a booking's id is what proves it is yours, as for GET /v1/bookings/:id. Bookings that
   * already belong to an account, this one or another, are left alone. Returns the ids it linked.
   */
  app.post<{ Body: { ids: string[] } }>('/v1/me/bookings/claim', {
    preHandler: auth.requireAccount,
    config: limit(30),
    schema: {
      body: {
        type: 'object', required: ['ids'],
        properties: { ids: { type: 'array', maxItems: 100, uniqueItems: true, items: { type: 'string', format: 'uuid' } } },
      },
    },
  }, async (req) => {
    const { ids } = req.body;
    return { claimed: ids.length ? await accounts.claimBookings((await auth.account(req)).id, ids) : [] };
  });
}
