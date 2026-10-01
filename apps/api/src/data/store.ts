import { randomUUID } from 'node:crypto';
import type { Hold, SeatId, Showtime } from '../domain/types.ts';
import { buildShowtimes, cinemas, movies } from './seed.ts';

export const HOLD_TTL_MS = 10 * 60 * 1000; // BRD open decision #8; placeholder until agreed with cinemas.

/**
 * In-memory stand-in for the database and cinema integrations.
 * Swap for a Postgres-backed repository and per-cinema adapters without changing the routes.
 */
export class Store {
  readonly movies = movies;
  readonly cinemas = cinemas;
  readonly showtimes: Showtime[];
  private holds = new Map<string, Hold>();

  constructor(now = new Date(), private clock: () => number = Date.now) {
    this.showtimes = buildShowtimes(now);
  }

  movie(id: string) { return this.movies.find((m) => m.id === id); }
  cinema(id: string) { return this.cinemas.find((c) => c.id === id); }
  showtime(id: string) { return this.showtimes.find((s) => s.id === id); }

  /** Seats currently held by other checkouts for this showtime. */
  heldSeats(showtimeId: string): SeatId[] {
    this.expireHolds();
    return [...this.holds.values()].filter((h) => h.showtimeId === showtimeId).flatMap((h) => h.seats);
  }

  /** Rechecks availability and holds exactly the requested seats, or returns the seats that are gone. */
  hold(showtimeId: string, seats: SeatId[]): { hold: Hold } | { unavailable: SeatId[] } {
    const showtime = this.showtime(showtimeId);
    if (!showtime) throw new Error('Unknown showtime');
    const taken = new Set([...showtime.seatMap.unavailable, ...this.heldSeats(showtimeId)]);
    const unavailable = seats.filter((s) => taken.has(s));
    if (unavailable.length) return { unavailable };
    const hold: Hold = { id: randomUUID(), showtimeId, seats, expiresAt: new Date(this.clock() + HOLD_TTL_MS).toISOString() };
    this.holds.set(hold.id, hold);
    return { hold };
  }

  release(holdId: string) { return this.holds.delete(holdId); }

  private expireHolds() {
    const now = this.clock();
    for (const [id, h] of this.holds) if (Date.parse(h.expiresAt) <= now) this.holds.delete(id);
  }
}
