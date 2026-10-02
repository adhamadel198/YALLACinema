import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Auth } from '../auth.ts';
import type { Accounts } from '../data/accounts.ts';
import {
  DEMO_STAFF_PASSWORD, FORMATS, MAX_TICKET_PRICE, demoStaffEmail, seedDemoOperators,
  type Correction, type Corrections, type StaffBooking,
} from '../data/operator.ts';
import type { Store } from '../data/store.ts';
import type { Showtime } from '../domain/types.ts';

type Deps = { store: Store; accounts: Accounts; auth: Auth; corrections: Corrections };

const localTime = (iso: string) => iso.slice(11, 16);
const dayPattern = '^\\d{4}-\\d{2}-\\d{2}$';

/**
 * A resold seat has two tickets: the seller's, now 'transferred', and the buyer's replacement in a resale booking.
 * Tickets count the seat once. Ticket revenue is what the cinema was paid for seats, so it stays as the seller's
 * booking paid it: a resale moves money between customers (and YALLA's fees), not to the cinema. Fees are the
 * booking fees customers paid YALLA, resale purchases included.
 */
const totalsOf = (bookings: StaffBooking[]) => ({
  bookings: bookings.length,
  tickets: bookings.reduce((n, b) => n + b.tickets.filter((t) => t.status !== 'transferred').length, 0),
  ticketRevenue: bookings.reduce((n, b) => n + (b.resale ? 0 : b.price.tickets), 0),
  fees: bookings.reduce((n, b) => n + b.price.fees, 0),
});

/**
 * Cinema operator portal (BRD 5.2, 7.5, 9). Staff see only their own cinema: its bookings by day and
 * showtime, and today's listings, which they can correct (price, format, start time) or cancel.
 */
export async function operatorRoutes(app: FastifyInstance, { store, accounts, auth, corrections }: Deps) {
  if (corrections.demo) await seedDemoOperators(accounts, store.cinemas);

  const staffOnly = { preHandler: auth.requireOperator };
  const noCinema = { error: 'Your staff account is not linked to a cinema on YALLA.' };
  /** The signed-in staff member's cinema (requireOperator has checked they are staff). */
  const cinemaOf = async (req: FastifyRequest) => store.cinema((await auth.account(req)).cinemaId ?? '');
  const movieOf = (id: string) => ({ id, title: store.movie(id)?.title ?? id });

  /** One of today's listed showtimes as staff see it: what customers see now, and what the cinema listed. */
  const listedView = (s: Showtime) => {
    const now = corrections.current(s);
    return {
      id: s.id, movie: movieOf(s.movieId), startsAt: now.startsAt, localTime: localTime(now.startsAt), format: now.format, price: now.price,
      cancelled: now.cancelled, corrected: now.corrected, editable: true,
      listed: { startsAt: s.startsAt, localTime: localTime(s.startsAt), format: s.format, price: s.price },
    };
  };

  /** A show no longer in the listings (another day), described from one of its bookings. */
  const unlistedView = async (b: StaffBooking) => {
    const o = (await corrections.stored([b.showtimeId])).get(b.showtimeId);
    const startsAt = o?.starts_at ?? b.sold.startsAt;
    return {
      id: b.showtimeId, movie: movieOf(b.movieId), startsAt, localTime: localTime(startsAt), format: o?.format ?? b.sold.format,
      price: o?.price ?? b.sold.price, cancelled: o?.cancelled ?? false, corrected: !!o, editable: false, listed: null,
    };
  };

  const seatsLeft = (s: Showtime, taken: string[] = []) => s.seatMap.rows * s.seatMap.cols - s.seatMap.unavailable.length - taken.length;

  /** Today's listed showtime `id`, if it belongs to the staff member's cinema. */
  async function ownShow(req: FastifyRequest, id: string): Promise<{ show: Showtime } | { status: 403 | 404; error: string }> {
    const cinema = await cinemaOf(req);
    if (!cinema) return { status: 403, ...noCinema };
    const show = store.scheduled.find((s) => s.id === id);
    if (!show) return { status: 404, error: 'That showtime is not in today’s listings.' };
    if (show.cinemaId !== cinema.id) return { status: 403, error: 'That showtime is at another cinema.' };
    return { show };
  }

  /** Demo staff sign-ins, on the embedded database only (development and previews). */
  app.get('/v1/operator/demo-accounts', async (_req, reply) => (corrections.demo
    ? { password: DEMO_STAFF_PASSWORD, accounts: store.cinemas.map((c) => ({ cinemaId: c.id, cinemaName: c.name, email: demoStaffEmail(c.id) })) }
    : reply.code(404).send({ error: 'Demo staff accounts exist only on the development database.' })));

  /** The cinema's shows on one day (today by default) with their bookings and totals. */
  app.get<{ Querystring: { day?: string } }>('/v1/operator/bookings', {
    ...staffOnly,
    schema: { querystring: { type: 'object', properties: { day: { type: 'string', pattern: dayPattern } } } },
  }, async (req, reply) => {
    const cinema = await cinemaOf(req);
    if (!cinema) return reply.code(403).send(noCinema);
    const today = corrections.today();
    const day = req.query.day ?? today;
    const bookings = await corrections.bookingsOn(cinema.id, day);
    const listed = day === today ? store.scheduled.filter((s) => s.cinemaId === cinema.id) : [];
    const taken = await store.takenSeats(listed.map((s) => s.id));
    const listedIds = new Set(listed.map((s) => s.id));
    const unlisted = [...new Map(bookings.filter((b) => !listedIds.has(b.showtimeId)).map((b) => [b.showtimeId, b])).values()];

    const shows = [
      ...listed.map((s) => {
        const view = listedView(s);
        return { ...view, seatsLeft: view.cancelled ? null : seatsLeft(s, taken.get(s.id)) };
      }),
      ...(await Promise.all(unlisted.map(async (b) => ({ ...(await unlistedView(b)), seatsLeft: null })))),
    ].map((show) => {
      const own = bookings.filter((b) => b.showtimeId === show.id);
      return { ...show, bookings: own, totals: totalsOf(own) };
    }).sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.movie.title.localeCompare(b.movie.title));

    const days = [...new Set([today, ...(await corrections.bookingDays(cinema.id))])].sort().reverse();
    return {
      cinema: { id: cinema.id, name: cinema.name }, day, today, days, formats: FORMATS, shows,
      totals: { shows: shows.filter((s) => !s.cancelled).length, cancelled: shows.filter((s) => s.cancelled).length, ...totalsOf(bookings) },
    };
  });

  /** Find a booking by its reference (with or without the "YL-"). 403 when it is another cinema's. */
  app.get<{ Params: { reference: string } }>('/v1/operator/bookings/:reference', {
    ...staffOnly,
    schema: { params: { type: 'object', properties: { reference: { type: 'string', pattern: '^[A-Za-z0-9-]{3,32}$' } } } },
  }, async (req, reply) => {
    const cinema = await cinemaOf(req);
    if (!cinema) return reply.code(403).send(noCinema);
    const typed = req.params.reference.toUpperCase();
    const booking = await corrections.bookingByReference(typed.startsWith('YL-') ? typed : `YL-${typed}`);
    if (!booking) return reply.code(404).send({ error: 'No booking has that reference.' });
    if (booking.cinemaId !== cinema.id) return reply.code(403).send({ error: 'That booking is for another cinema.' });
    const listed = store.scheduled.find((s) => s.id === booking.showtimeId);
    return { booking, show: listed ? listedView(listed) : await unlistedView(booking) };
  });

  /** One of today's showtimes with its bookings and the history of corrections to it. */
  app.get<{ Params: { id: string } }>('/v1/operator/showtimes/:id', staffOnly, async (req, reply) => {
    const found = await ownShow(req, req.params.id);
    if ('error' in found) return reply.code(found.status).send({ error: found.error });
    const s = found.show;
    const view = listedView(s);
    const bookings = await corrections.bookingsOf(s.id);
    const taken = (await store.takenSeats([s.id])).get(s.id);
    return {
      show: { ...view, seatsLeft: view.cancelled ? null : seatsLeft(s, taken), bookings, totals: totalsOf(bookings) },
      formats: FORMATS, maxPrice: MAX_TICKET_PRICE, changes: await corrections.changes(s.id),
    };
  });

  /**
   * Correct one of today's listings: price (EGP), format, start time ("HH:MM", same day) or cancellation
   * (`cancelled: false` reinstates). Applies to listings, search, seat maps, holds and new bookings at once.
   */
  app.patch<{ Params: { id: string }; Body: Correction }>('/v1/operator/showtimes/:id', {
    ...staffOnly,
    schema: {
      body: {
        type: 'object', additionalProperties: false,
        properties: {
          price: { type: 'integer', minimum: 1, maximum: MAX_TICKET_PRICE },
          format: { type: 'string', enum: FORMATS },
          time: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
          cancelled: { type: 'boolean' },
        },
      },
    },
  }, async (req, reply) => {
    const { price, format, time, cancelled } = req.body;
    if (price === undefined && format === undefined && time === undefined && cancelled === undefined)
      return reply.code(400).send({ error: 'Nothing to change: send price, format, time or cancelled.' });
    const found = await ownShow(req, req.params.id);
    if ('error' in found) return reply.code(found.status).send({ error: found.error });
    const { change } = await corrections.correct(found.show, { price, format, time, cancelled }, (await auth.account(req)).id);
    return { show: listedView(found.show), change };
  });
}
