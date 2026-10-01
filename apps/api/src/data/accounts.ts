import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Db } from '../db/index.ts';
import { isUniqueViolation } from '../db/index.ts';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type Role = 'customer' | 'operator';
export interface Account {
  id: string;
  email: string;
  name: string;
  mobile: string;
  role: Role;
  /** The cinema an operator works for; null for customers. */
  cinemaId: string | null;
  createdAt: string;
}
export type NewAccount = { name: string; email: string; mobile: string; password: string };

type AccountRow = { id: string; email: string; name: string; mobile: string; role: Role; cinema_id: string | null; created_at: Date | string; password_hash: string };
const toAccount = (r: AccountRow): Account => ({
  id: r.id, email: r.email, name: r.name, mobile: r.mobile, role: r.role, cinemaId: r.cinema_id, createdAt: new Date(r.created_at).toISOString(),
});

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${(await scryptAsync(password, salt, 32)).toString('base64')}`;
}

async function passwordMatches(password: string, stored: string) {
  const [, salt, hash] = stored.split('$');
  const expected = Buffer.from(hash, 'base64');
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

/** Accounts and signed-in sessions (email and password; the BRD leaves the sign-in method open). */
export class Accounts {
  constructor(private db: Db, private clock: () => number = Date.now) {}

  /** Returns null when the email is already registered. */
  async create(details: NewAccount, role: Role = 'customer', cinemaId: string | null = null): Promise<Account | null> {
    try {
      const { rows } = await this.db.query<AccountRow>(
        `INSERT INTO accounts (id, email, name, mobile, password_hash, role, cinema_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [randomUUID(), details.email.trim().toLowerCase(), details.name.trim(), details.mobile.trim(), await hashPassword(details.password), role, cinemaId],
      );
      return toAccount(rows[0]);
    } catch (e) {
      if (isUniqueViolation(e)) return null;
      throw e;
    }
  }

  async get(id: string): Promise<Account | null> {
    const { rows } = await this.db.query<AccountRow>('SELECT * FROM accounts WHERE id = $1', [id]);
    return rows[0] ? toAccount(rows[0]) : null;
  }

  /** The account for this email and password, or null. */
  async verify(email: string, password: string): Promise<Account | null> {
    const { rows } = await this.db.query<AccountRow>('SELECT * FROM accounts WHERE email = $1', [email.trim().toLowerCase()]);
    if (!rows[0]) {
      await hashPassword(password); // Take as long as a real check, so timing doesn't reveal which emails exist.
      return null;
    }
    return (await passwordMatches(password, rows[0].password_hash)) ? toAccount(rows[0]) : null;
  }

  /** Starts a session and returns its token, which the app sends as `Authorization: Bearer <token>`. */
  async startSession(accountId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.db.query('INSERT INTO sessions (token_hash, account_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash(token), accountId, new Date(this.clock() + SESSION_TTL_MS)]);
    return token;
  }

  async forToken(token: string): Promise<Account | null> {
    const { rows } = await this.db.query<AccountRow>(
      'SELECT a.* FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = $1 AND s.expires_at > $2',
      [tokenHash(token), new Date(this.clock())],
    );
    return rows[0] ? toAccount(rows[0]) : null;
  }

  async endSession(token: string) {
    await this.db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash(token)]);
  }

  /** Ids of the account's bookings, newest first (booking history, BRD 5.1). */
  async bookingIds(accountId: string): Promise<string[]> {
    const { rows } = await this.db.query<{ id: string }>(
      'SELECT id FROM bookings WHERE account_id = $1 ORDER BY created_at DESC, reference', [accountId]);
    return rows.map((r) => r.id);
  }

  /**
   * Links guest bookings to the account. Only bookings with no account yet are linked, so nobody can
   * take a booking that already belongs to someone. Returns the ids it linked.
   */
  async claimBookings(accountId: string, bookingIds: string[]): Promise<string[]> {
    const { rows } = await this.db.query<{ id: string }>(
      'UPDATE bookings SET account_id = $1 WHERE id = ANY($2::uuid[]) AND account_id IS NULL RETURNING id', [accountId, bookingIds]);
    return rows.map((r) => r.id);
  }
}
