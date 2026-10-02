import { randomUUID } from 'node:crypto';
import type { Db, Queryable } from '../db/index.ts';
import { isUniqueViolation } from '../db/index.ts';
import type { Booking, Hold, SeatId, Showtime } from '../domain/types.ts';
import type { Corrections } from './operator.ts';
import { buildShowtimes, cairoDay, cinemas, movies } from './seed.ts';

export const HOLD_TTL_MS = 10 * 60 * 1000; // BRD open decision #8; placeholder until agreed with cinemas.

type HoldRow = { id: string; showtime_id: string; seats: string[]; expires_at: Date | string };
type BookingRow = {
  id: string; reference: string; showtime_id: string; movie_id: string; cinema_id: string; starts_at: string; format: string;
  ticket_price: number; holder: Booking['holder']; payment_method: Booking['paymentMethod']; price: Booking['price'];
  payment_ref: string; cinema_confirmation: string; created_at: Date | string; account_id: string | null;
};

const iso = (d: Date | string) => new Date(d).toISOString();
const toHold = (r: HoldRow): Hold => ({ id: r.id, showtimeId: r.showtime_id, seats: r.seats, expiresAt: iso(r.expires_at) });

/**
 * Listings (movies, cinemas, showtimes) come from seed data standing in for the cinema integrations.
 * Holds, bookings and tickets live in the database.
 */
export class Store {
  readonly movies = movies;
  readonly cinemas = cinemas;
  private day = '';
  private todays: Showtime[] = [];

  /** `corrections`: cinema staff corrections to listings (data/operator.ts). */
  constructor(private db: Db, private clock: () => number = Date.now, readonly corrections?: Corrections) {}

  /** Today's showtimes in Cairo as the cinemas list them, rebuilt when the day changes. */
  get scheduled(): Showtime[] {
    const now = new Date(this.clock());
    const [day] = cairoDay(now);
    if (day !== this.day) {
      this.day = day;
      this.todays = buildShowtimes(now);
    }
    return this.todays;
  }

  /** Today's showtimes as customers see them: staff corrections applied, cancelled shows left out. */
  get showtimes(): Showtime[] {
    return this.corrections?.apply(this.scheduled) ?? this.scheduled;
  }

  movie(id: string) { return this.movies.find((m) => m.id === id); }
  cinema(id: string) { return this.cinemas.find((c) => c.id === id); }
  showtime(id: string) { return this.showtimes.find((s) => s.id === id); }

  private now() { return new Date(this.clock()); }

  /**
   * Seats sold through the platform or held in someone's checkout, per showtime, each seat once: a resold seat
   * has the seller's 'transferred' ticket and the buyer's replacement, and stays taken.
   */
  async takenSeats(showtimeIds: string[]): Promise<Map<string, SeatId[]>> {
    const { rows } = await this.db.query<{ showtime_id: string; seat: string }>(
      `SELECT showtime_id, seat FROM tickets WHERE showtime_id = ANY($1)
       UNION
       SELECT showtime_id, seat FROM held_seats WHERE showtime_id = ANY($1) AND expires_at > $2`,
      [showtimeIds, this.now()],
    );
    const taken = new Map<string, SeatId[]>();
    for (const r of rows) taken.set(r.showtime_id, [...(taken.get(r.showtime_id) ?? []), r.seat]);
    return taken;
  }

  /**
   * Rechecks availability and holds exactly the requested seats, or returns the seats that are gone.
   * A customer has one checkout at a time, so a new hold releases the same client's previous one.
   */
  async hold(showtimeId: string, seats: SeatId[], clientId: string): Promise<{ hold: Hold } | { unavailable: SeatId[] }> {
    const showtime = this.showtime(showtimeId);
    if (!showtime) throw new Error('Unknown showtime');
    const fromCinema = seats.filter((s) => showtime.seatMap.unavailable.includes(s));
    if (fromCinema.length) return { unavailable: fromCinema };

    const now = this.now();
    const hold: Hold = { id: randomUUID(), showtimeId, seats, expiresAt: new Date(now.getTime() + HOLD_TTL_MS).toISOString() };
    try {
      return await this.db.transaction(async (tx) => {
        await tx.query('DELETE FROM holds WHERE expires_at <= $1 OR client_id = $2', [now, clientId]);
        const sold = await tx.query<{ seat: string }>('SELECT DISTINCT seat FROM tickets WHERE showtime_id = $1 AND seat = ANY($2)', [showtimeId, seats]);
        if (sold.rows.length) throw new SeatsTaken(sold.rows.map((r) => r.seat));
        await tx.query('INSERT INTO holds (id, showtime_id, client_id, seats, expires_at) VALUES ($1, $2, $3, $4, $5)',
          [hold.id, showtimeId, clientId, seats, hold.expiresAt]);
        for (const seat of seats)
          await tx.query('INSERT INTO held_seats (showtime_id, seat, hold_id, expires_at) VALUES ($1, $2, $3, $4)', [showtimeId, seat, hold.id, hold.expiresAt]);
        return { hold };
      });
    } catch (e) {
      if (e instanceof SeatsTaken) return { unavailable: e.seats };
      if (isUniqueViolation(e)) return { unavailable: await this.heldBy(showtimeId, seats) };
      throw e;
    }
  }

  private async heldBy(showtimeId: string, seats: SeatId[]) {
    const taken = new Set((await this.takenSeats([showtimeId])).get(showtimeId));
    const gone = seats.filter((s) => taken.has(s));
    return gone.length ? gone : seats;
  }

  async release(holdId: string) {
    const { rows } = await this.db.query('DELETE FROM holds WHERE id = $1 RETURNING id', [holdId]);
    return rows.length > 0;
  }

  /** An unexpired hold, or undefined. */
  async getHold(holdId: string, q: Queryable = this.db): Promise<Hold | undefined> {
    const { rows } = await q.query<HoldRow>('SELECT * FROM holds WHERE id = $1 AND expires_at > $2', [holdId, this.now()]);
    return rows[0] && toHold(rows[0]);
  }

  /** Turns an unexpired hold into sold tickets. Returns false if the hold expired first. */
  async saveBooking(holdId: string, b: Booking): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // Claim the hold before anything else, so a hold released meanwhile (by staff changing the show) fails the booking.
      const claimed = await tx.query('DELETE FROM holds WHERE id = $1 AND expires_at > $2 RETURNING id', [holdId, this.now()]);
      if (!claimed.rows.length) return false;
      const s = b.showtime;
      await tx.query(
        `INSERT INTO bookings (id, reference, showtime_id, movie_id, cinema_id, starts_at, format, ticket_price, holder,
           payment_method, price, payment_ref, cinema_confirmation, created_at, account_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [b.id, b.reference, s.showtimeId, s.movieId, s.cinemaId, s.startsAt, s.format, s.price, JSON.stringify(b.holder),
          b.paymentMethod, JSON.stringify(b.price), b.paymentRef, b.cinemaConfirmation, b.createdAt, b.accountId],
      );
      for (const t of b.tickets)
        await tx.query('INSERT INTO tickets (id, booking_id, showtime_id, seat, qr, status) VALUES ($1, $2, $3, $4, $5, $6)',
          [t.id, b.id, s.showtimeId, t.seat, t.qr, t.status]);
      return true;
    });
  }

  async booking(id: string): Promise<Booking | undefined> {
    const { rows } = await this.db.query<BookingRow>('SELECT * FROM bookings WHERE id = $1', [id]);
    const r = rows[0];
    if (!r) return undefined;
    const tickets = await this.db.query<Booking['tickets'][number]>('SELECT id, seat, qr, status FROM tickets WHERE booking_id = $1 ORDER BY seat', [id]);
    return {
      id: r.id, reference: r.reference, holder: r.holder, accountId: r.account_id, paymentMethod: r.payment_method, price: r.price,
      paymentRef: r.payment_ref, cinemaConfirmation: r.cinema_confirmation, createdAt: iso(r.created_at), tickets: tickets.rows,
      showtime: { showtimeId: r.showtime_id, movieId: r.movie_id, cinemaId: r.cinema_id, startsAt: r.starts_at, format: r.format, price: r.ticket_price },
    };
  }
}

class SeatsTaken extends Error {
  constructor(readonly seats: SeatId[]) { super('Seats taken'); }
}
