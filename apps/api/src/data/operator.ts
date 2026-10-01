import { randomBytes, randomUUID } from 'node:crypto';
import type { Db } from '../db/index.ts';
import type { Booking, Cinema, Showtime, Ticket } from '../domain/types.ts';
import { emailSchema, mobileSchema } from '../routes/schemas.ts';
import type { Account, Accounts } from './accounts.ts';
import { localizeFormat, type Lang } from './i18n.ts';
import { cairoDay } from './seed.ts';

// Cinema operator portal (BRD 7.5, 9): staff corrections to listings, the record of show changes and the
// bookings they affect, and the staff view of a cinema's bookings.

/** Formats staff can pick when correcting a listing. */
export const FORMATS = ['Standard', 'Premium', 'IMAX', 'Dolby Atmos', '3D', '4DX'] as const;
/** Highest ticket price staff can set, in EGP. A guard against typing mistakes, not a business rule. */
export const MAX_TICKET_PRICE = 5000;

/** A show as customers see it. */
export interface ShowState { startsAt: string; format: string; price: number; cancelled: boolean }
/** What staff can correct. `time` is "HH:MM" in the cinema's local time, on the listed day. */
export type Correction = { price?: number; format?: string; time?: string; cancelled?: boolean };
export type ChangeKind = 'changed' | 'cancelled' | 'reinstated';

/** On a customer's ticket when the show changed or was cancelled after they booked (BRD 9). */
export type ShowChange =
  | { kind: 'cancelled'; at: string }
  | { kind: 'changed'; at: string; startsAt: string; localTime: string; format: string; changed: ('time' | 'format')[] };

/** A booking as cinema staff see it: no contact details, payment references or ticket codes. */
export interface StaffBooking {
  reference: string;
  showtimeId: string;
  movieId: string;
  cinemaId: string;
  holderName: string;
  seats: string[];
  tickets: { seat: string; status: Ticket['status'] }[];
  price: Booking['price'];
  paymentMethod: Booking['paymentMethod'];
  createdAt: string;
  /** The show as it was sold. */
  sold: { startsAt: string; format: string; price: number };
}

type OverrideRow = {
  showtime_id: string; cinema_id: string; day: string; price: number | null; format: string | null; starts_at: string | null; cancelled: boolean;
};
type BookingRow = {
  id: string; reference: string; showtime_id: string; movie_id: string; cinema_id: string; starts_at: string; format: string;
  ticket_price: number; holder: Booking['holder']; payment_method: Booking['paymentMethod']; price: Booking['price']; created_at: Date | string;
};

const iso = (d: Date | string) => new Date(d).toISOString();
const seatOrder = (a: string, b: string) => a[0].localeCompare(b[0]) || Number(a.slice(1)) - Number(b.slice(1));

const stateOf = (s: Showtime, o?: OverrideRow): ShowState => ({
  startsAt: o?.starts_at ?? s.startsAt, format: o?.format ?? s.format, price: o?.price ?? s.price, cancelled: o?.cancelled ?? false,
});
const sameState = (a: ShowState, b: ShowState) =>
  a.startsAt === b.startsAt && a.format === b.format && a.price === b.price && a.cancelled === b.cancelled;
const isCorrected = (o?: OverrideRow) => !!o && (o.price != null || o.format != null || o.starts_at != null);

/** The listed start moved to "HH:MM" on the same day, keeping the listing's UTC offset. */
export function atTime(startsAt: string, time: string) {
  const m = /^(\d{4}-\d{2}-\d{2}T)\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(.*)$/.exec(startsAt);
  if (!m) throw new Error(`Unexpected start time ${startsAt}`);
  return `${m[1]}${time}:00${m[2]}`;
}

/**
 * Staff corrections to listings. They are stored in the database (showtime_overrides) and applied on top of
 * the cinema's listings wherever customers see them. Store.showtimes is synchronous, so this keeps today's
 * corrections in memory and app.ts reloads them at the start of every API request: with several API
 * instances running, each one serves what the database says rather than its own copy.
 */
export class Corrections {
  private overrides = new Map<string, OverrideRow>();
  private applied?: { base: Showtime[]; overrides: Map<string, OverrideRow>; list: Showtime[] };
  // Each load and local correction gets a number, so a slow load never replaces newer corrections.
  private started = 0;
  private loaded = 0;

  constructor(private db: Db, private clock: () => number = Date.now) {}

  /** The embedded database (development, tests, previews), where demo staff accounts are seeded. */
  get demo() { return this.db.kind === 'pglite'; }

  /** Today's date in Cairo, YYYY-MM-DD. */
  today() { return cairoDay(new Date(this.clock()))[0]; }

  /** Reloads today's corrections from the database. */
  async refresh() {
    const n = ++this.started;
    const { rows } = await this.db.query<OverrideRow>('SELECT * FROM showtime_overrides WHERE day = $1', [this.today()]);
    if (n < this.loaded) return;
    this.loaded = n;
    this.overrides = new Map(rows.map((r) => [r.showtime_id, r]));
  }

  /** Listings as customers see them: corrections applied and cancelled shows left out. */
  apply(base: Showtime[]): Showtime[] {
    if (this.applied?.base === base && this.applied.overrides === this.overrides) return this.applied.list;
    const list = base.flatMap((s) => {
      const o = this.overrides.get(s.id);
      if (!o) return [s];
      if (o.cancelled) return [];
      const { startsAt, format, price } = stateOf(s, o);
      return [{ ...s, startsAt, format, price }];
    });
    this.applied = { base, overrides: this.overrides, list };
    return list;
  }

  /** One of today's listed showtimes as customers now see it, and whether staff corrected it. */
  current(s: Showtime): ShowState & { corrected: boolean } {
    const o = this.overrides.get(s.id);
    return { ...stateOf(s, o), corrected: isCorrected(o) };
  }

  /** Stored corrections for showtimes that are not in today's listings (staff looking at another day). */
  async stored(showtimeIds: string[]): Promise<Map<string, OverrideRow>> {
    if (!showtimeIds.length) return new Map();
    const { rows } = await this.db.query<OverrideRow>('SELECT * FROM showtime_overrides WHERE showtime_id = ANY($1)', [showtimeIds]);
    return new Map(rows.map((r) => [r.showtime_id, r]));
  }

  /**
   * Corrects one of today's listed showtimes (`base`, as the cinema lists it) and records the change.
   * Holds in progress for the show are released, so nobody pays for details they were not shown and a
   * cancelled show cannot be sold. Bookings already made keep what they bought; those whose show moved,
   * changed format, was cancelled or reinstated are recorded against the change so they can be found.
   */
  async correct(base: Showtime, fix: Correction, accountId: string) {
    const day = base.startsAt.slice(0, 10);
    const result = await this.db.transaction(async (tx) => {
      // Lock the show's row so two staff members correcting it at once take turns.
      await tx.query('INSERT INTO showtime_overrides (showtime_id, cinema_id, day) VALUES ($1, $2, $3) ON CONFLICT (showtime_id) DO NOTHING',
        [base.id, base.cinemaId, day]);
      const { rows: [row] } = await tx.query<OverrideRow>('SELECT * FROM showtime_overrides WHERE showtime_id = $1 FOR UPDATE', [base.id]);
      const before = stateOf(base, row);
      const after: ShowState = {
        startsAt: fix.time ? atTime(base.startsAt, fix.time) : before.startsAt,
        format: fix.format ?? before.format,
        price: fix.price ?? before.price,
        cancelled: fix.cancelled ?? before.cancelled,
      };
      // Only differences from the cinema's listing are stored, so a value set back to the listing is no longer a correction.
      const stored: OverrideRow = {
        showtime_id: base.id, cinema_id: base.cinemaId, day,
        price: after.price === base.price ? null : after.price,
        format: after.format === base.format ? null : after.format,
        starts_at: after.startsAt === base.startsAt ? null : after.startsAt,
        cancelled: after.cancelled,
      };
      const empty = !isCorrected(stored) && !stored.cancelled;
      const unchanged = sameState(before, after);
      if (empty) await tx.query('DELETE FROM showtime_overrides WHERE showtime_id = $1', [base.id]);
      else if (!unchanged)
        await tx.query(
          `INSERT INTO showtime_overrides (showtime_id, cinema_id, day, price, format, starts_at, cancelled, updated_by, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (showtime_id) DO UPDATE SET price = EXCLUDED.price, format = EXCLUDED.format, starts_at = EXCLUDED.starts_at,
             cancelled = EXCLUDED.cancelled, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at`,
          [base.id, base.cinemaId, day, stored.price, stored.format, stored.starts_at, stored.cancelled, accountId, new Date(this.clock())]);
      if (unchanged) return { stored: empty ? undefined : stored, after, change: null };

      const kind: ChangeKind = before.cancelled === after.cancelled ? 'changed' : after.cancelled ? 'cancelled' : 'reinstated';
      // Released before affected bookings are listed, so a checkout completing right now is either listed or refunded.
      await tx.query('DELETE FROM holds WHERE showtime_id = $1', [base.id]);
      // Open resale listings (data/resale.ts) close when the show starts, so they follow a new start time.
      if (before.startsAt !== after.startsAt)
        await tx.query(`UPDATE resale_listings SET starts_at = $2 WHERE showtime_id = $1 AND status = 'open'`, [base.id, after.startsAt]);
      const changeId = randomUUID();
      await tx.query('INSERT INTO showtime_changes (id, showtime_id, cinema_id, kind, before, after, account_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [changeId, base.id, base.cinemaId, kind, JSON.stringify(before), JSON.stringify(after), accountId, new Date(this.clock())]);
      // A new price only applies to new bookings, so it affects nobody who already has tickets.
      const affects = kind !== 'changed' || (!after.cancelled && (before.startsAt !== after.startsAt || before.format !== after.format));
      const affected = affects
        ? (await tx.query('INSERT INTO showtime_change_bookings (change_id, booking_id) SELECT $1, id FROM bookings WHERE showtime_id = $2 RETURNING booking_id',
          [changeId, base.id])).rows.length
        : 0;
      return { stored: empty ? undefined : stored, after, change: { id: changeId, kind, affectedBookings: affected } };
    });
    // This instance serves the correction at once; other instances load it on their next request.
    const next = new Map(this.overrides);
    if (result.stored) next.set(base.id, result.stored);
    else next.delete(base.id);
    this.overrides = next;
    this.loaded = ++this.started;
    return { state: result.after, change: result.change };
  }

  /** The notice for a booking whose show changed or was cancelled after it was sold, or null. */
  async showChange(booking: Pick<Booking, 'id' | 'showtime'>, lang: Lang = 'en'): Promise<ShowChange | null> {
    const { rows: [last] } = await this.db.query<{ after: ShowState; created_at: Date | string }>(
      `SELECT c.after, c.created_at FROM showtime_change_bookings cb JOIN showtime_changes c ON c.id = cb.change_id
       WHERE cb.booking_id = $1 ORDER BY c.seq DESC LIMIT 1`,
      [booking.id],
    );
    if (!last) return null;
    const at = iso(last.created_at), sold = booking.showtime, now = last.after;
    if (now.cancelled) return { kind: 'cancelled', at };
    const changed = [...(now.startsAt !== sold.startsAt ? ['time' as const] : []), ...(now.format !== sold.format ? ['format' as const] : [])];
    // Set back to what they bought: nothing to tell them.
    if (!changed.length) return null;
    return { kind: 'changed', at, startsAt: now.startsAt, localTime: now.startsAt.slice(11, 16), format: localizeFormat(now.format, lang), changed };
  }

  /** Every change to a showtime, newest first, with the bookings each one affected. */
  async changes(showtimeId: string) {
    const { rows } = await this.db.query<{ id: string; kind: ChangeKind; before: ShowState; after: ShowState; created_at: Date | string; by_name: string | null }>(
      `SELECT c.id, c.kind, c.before, c.after, c.created_at, a.name AS by_name FROM showtime_changes c
       LEFT JOIN accounts a ON a.id = c.account_id WHERE c.showtime_id = $1 ORDER BY c.seq DESC`,
      [showtimeId],
    );
    if (!rows.length) return [];
    const affected = await this.db.query<{ change_id: string; reference: string; holder_name: string; notified_at: Date | string | null }>(
      `SELECT cb.change_id, b.reference, b.holder->>'name' AS holder_name, cb.notified_at FROM showtime_change_bookings cb
       JOIN bookings b ON b.id = cb.booking_id WHERE cb.change_id = ANY($1::uuid[]) ORDER BY b.reference`,
      [rows.map((r) => r.id)],
    );
    return rows.map((r) => ({
      kind: r.kind, at: iso(r.created_at), by: r.by_name, before: r.before, after: r.after,
      affected: affected.rows.filter((a) => a.change_id === r.id)
        .map((a) => ({ reference: a.reference, holderName: a.holder_name, notifiedAt: a.notified_at && iso(a.notified_at) })),
    }));
  }

  /** A cinema's bookings for shows on one day (YYYY-MM-DD), oldest first. */
  bookingsOn(cinemaId: string, day: string) {
    return this.staffBookings('cinema_id = $1 AND left(starts_at, 10) = $2', [cinemaId, day]);
  }

  /** The bookings for one showtime, oldest first. */
  bookingsOf(showtimeId: string) {
    return this.staffBookings('showtime_id = $1', [showtimeId]);
  }

  async bookingByReference(reference: string): Promise<StaffBooking | undefined> {
    return (await this.staffBookings('reference = $1', [reference]))[0];
  }

  /** Days with bookings at a cinema, newest first. */
  async bookingDays(cinemaId: string, limit = 30): Promise<string[]> {
    const { rows } = await this.db.query<{ day: string }>(
      'SELECT DISTINCT left(starts_at, 10) AS day FROM bookings WHERE cinema_id = $1 ORDER BY day DESC LIMIT $2', [cinemaId, limit]);
    return rows.map((r) => r.day);
  }

  private async staffBookings(where: string, params: unknown[]): Promise<StaffBooking[]> {
    const { rows } = await this.db.query<BookingRow>(
      `SELECT id, reference, showtime_id, movie_id, cinema_id, starts_at, format, ticket_price, holder, payment_method, price, created_at
       FROM bookings WHERE ${where} ORDER BY created_at`,
      params,
    );
    if (!rows.length) return [];
    const tickets = await this.db.query<{ booking_id: string; seat: string; status: Ticket['status'] }>(
      'SELECT booking_id, seat, status FROM tickets WHERE booking_id = ANY($1::uuid[])', [rows.map((r) => r.id)]);
    return rows.map((r) => {
      const own = tickets.rows.filter((t) => t.booking_id === r.id).sort((a, b) => seatOrder(a.seat, b.seat));
      return {
        reference: r.reference, showtimeId: r.showtime_id, movieId: r.movie_id, cinemaId: r.cinema_id, holderName: r.holder.name,
        seats: own.map((t) => t.seat), tickets: own.map((t) => ({ seat: t.seat, status: t.status })),
        price: r.price, paymentMethod: r.payment_method, createdAt: iso(r.created_at),
        sold: { startsAt: r.starts_at, format: r.format, price: r.ticket_price },
      };
    });
  }
}

/** Demo staff accounts, one per cinema, seeded on the embedded database only so the portal can be tried. */
export const DEMO_STAFF_PASSWORD = 'yalla-staff-demo';
export const demoStaffEmail = (cinemaId: string) => `${cinemaId}@staff.yalla.demo`;

export async function seedDemoOperators(accounts: Accounts, cinemas: Cinema[]) {
  // create() returns null when the account already exists (a development database that persists).
  await Promise.all(cinemas.map((c) => accounts.create(
    { name: `${c.shortName} staff`, email: demoStaffEmail(c.id), mobile: '+20 100 000 0000', password: DEMO_STAFF_PASSWORD }, 'operator', c.id)));
}

/**
 * Creates a staff account for a cinema (`npm run create-operator`). Without a password, a random one is
 * generated and returned so it can be shown once.
 */
export async function createOperator(
  accounts: Accounts, cinemas: Cinema[],
  input: { cinema?: string; email?: string; name?: string; mobile?: string; password?: string },
): Promise<{ account: Account; cinema: Cinema; generatedPassword?: string }> {
  const cinema = cinemas.find((c) => c.id === input.cinema);
  if (!cinema) throw new Error(`Unknown cinema "${input.cinema ?? ''}". Use one of: ${cinemas.map((c) => c.id).join(', ')}.`);
  const email = input.email?.trim() ?? '';
  if (!new RegExp(emailSchema.pattern).test(email)) throw new Error('Give the staff member\'s email with --email.');
  const name = input.name?.trim() ?? '';
  if (name.length < 2) throw new Error('Give the staff member\'s name with --name.');
  const mobile = input.mobile?.trim() ?? '';
  if (mobile && !new RegExp(mobileSchema.pattern).test(mobile)) throw new Error('--mobile should look like +20 100 123 4567.');
  const generatedPassword = input.password ? undefined : randomBytes(12).toString('base64url');
  const password = input.password ?? generatedPassword!;
  if (password.length < 12) throw new Error('Use a password of at least 12 characters.');
  const account = await accounts.create({ name, email, mobile, password }, 'operator', cinema.id);
  if (!account) throw new Error(`An account with the email ${email} already exists.`);
  return { account, cinema, generatedPassword };
}
