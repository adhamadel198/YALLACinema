import { randomUUID } from 'node:crypto';
import type { Db, Queryable } from '../db/index.ts';
import { isUniqueViolation } from '../db/index.ts';
import type { Booking, SeatId, ShowtimeSnapshot, Ticket } from '../domain/types.ts';

export type PayoutDetails =
  | { kind: 'wallet'; mobile: string }
  | { kind: 'bank'; bankName: string; accountName: string; accountNumber: string };

/**
 * BRD 11 asks for verified payout details, but no verification provider is chosen yet (open decision 11).
 * Until one is, details are stored with this status and accepted for listing; nothing is paid out for real.
 */
export const SANDBOX_VERIFICATION = 'unverified-sandbox';

/**
 * A purchase normally finishes within one request. One still unfinished after this long was interrupted
 * (e.g. the server stopped mid-purchase), so its tickets go back on sale.
 */
export const PURCHASE_TIMEOUT_MS = 10 * 60 * 1000;

export interface PayoutMethod {
  kind: PayoutDetails['kind'];
  /** Safe to show, e.g. "•••• 4567" or "CIB · •••• 1234". */
  label: string;
  verification: 'unverified-sandbox' | 'verified';
  updatedAt: string;
}

export type ListingStatus = 'open' | 'sold' | 'withdrawn' | 'expired' | 'closed';
/**
 * listed: for sale · reserved: a buyer is paying · sold: transferred to a buyer · withdrawn: taken back by the seller ·
 * expired: unsold when the show started · returned: the cinema couldn't transfer it, so it went back to the seller.
 */
export type ListedTicketState = 'listed' | 'reserved' | 'sold' | 'withdrawn' | 'expired' | 'returned';

export interface Listing {
  id: string;
  sellerAccountId: string;
  bookingId: string;
  /** The show as the seller booked it; its `price` is what the seller paid per ticket, excluding fees. */
  showtime: ShowtimeSnapshot;
  /** Asking price per ticket. */
  price: number;
  status: ListingStatus;
  tickets: { ticketId: string; seat: SeatId; state: ListedTicketState; ticketStatus: Ticket['status'] }[];
  /** Owed to the seller for completed sales from this listing and not paid out yet. */
  pendingPayout: number;
  createdAt: string;
  closedAt: string | null;
}

/** A ticket as the cinema integration needs it. */
export type TicketRef = { id: string; showtimeId: string; seat: SeatId; qr: string };

type ListingRow = {
  id: string; seller_account_id: string; booking_id: string; price: number; status: ListingStatus;
  created_at: Date | string; closed_at: Date | string | null;
  showtime_id: string; movie_id: string; cinema_id: string; show_starts_at: string; format: string; ticket_price: number;
  tickets: Listing['tickets']; pending_payout: number | string;
};
type PayoutRow = { kind: PayoutDetails['kind']; details: PayoutDetails; verification: PayoutMethod['verification']; updated_at: Date | string };

const iso = (d: Date | string) => new Date(d).toISOString();
const bySeat = (a: { seat: string }, b: { seat: string }) => a.seat[0].localeCompare(b.seat[0]) || Number(a.seat.slice(1)) - Number(b.seat.slice(1));
const last4 = (s: string) => `•••• ${s.replace(/\s/g, '').slice(-4)}`;

const toListing = (r: ListingRow): Listing => ({
  id: r.id, sellerAccountId: r.seller_account_id, bookingId: r.booking_id, price: r.price, status: r.status,
  showtime: { showtimeId: r.showtime_id, movieId: r.movie_id, cinemaId: r.cinema_id, startsAt: r.show_starts_at, format: r.format, price: r.ticket_price },
  tickets: [...r.tickets].sort(bySeat), pendingPayout: Number(r.pending_payout),
  createdAt: iso(r.created_at), closedAt: r.closed_at ? iso(r.closed_at) : null,
});

const toPayout = (r: PayoutRow): PayoutMethod => ({
  kind: r.kind,
  label: r.details.kind === 'wallet' ? last4(r.details.mobile) : `${r.details.bankName} · ${last4(r.details.accountNumber)}`,
  verification: r.verification, updatedAt: iso(r.updated_at),
});

const LISTING_SELECT = `
  SELECT l.id, l.seller_account_id, l.booking_id, l.price, l.status, l.created_at, l.closed_at,
         b.showtime_id, b.movie_id, b.cinema_id, b.starts_at AS show_starts_at, b.format, b.ticket_price,
         (SELECT coalesce(json_agg(json_build_object('ticketId', lt.ticket_id, 'seat', lt.seat, 'state', lt.state, 'ticketStatus', t.status)), '[]')
            FROM resale_listing_tickets lt JOIN tickets t ON t.id = lt.ticket_id WHERE lt.listing_id = l.id) AS tickets,
         (SELECT coalesce(sum(s.seller_payout), 0) FROM resale_sales s
           WHERE s.listing_id = l.id AND s.status = 'completed' AND s.payout_status = 'pending') AS pending_payout
    FROM resale_listings l JOIN bookings b ON b.id = l.booking_id`;

class Unavailable extends Error {
  constructor(readonly ticketIds: string[]) { super('Tickets unavailable'); }
}

/** Resale listings, sales and seller payout details (BRD 11). Business rules are checked in routes/resale.ts. */
export class Resale {
  constructor(private db: Db, private clock: () => number = Date.now) {}

  now() { return new Date(this.clock()); }

  async payoutMethod(accountId: string): Promise<PayoutMethod | null> {
    const { rows } = await this.db.query<PayoutRow>('SELECT * FROM payout_methods WHERE account_id = $1', [accountId]);
    return rows[0] ? toPayout(rows[0]) : null;
  }

  /** Adds or replaces the seller's payout method, unverified until a verification provider exists. */
  async setPayoutMethod(accountId: string, details: PayoutDetails): Promise<PayoutMethod> {
    const { rows } = await this.db.query<PayoutRow>(
      `INSERT INTO payout_methods (account_id, kind, details, verification, updated_at) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (account_id) DO UPDATE SET kind = $2, details = $3, verification = $4, updated_at = $5 RETURNING *`,
      [accountId, details.kind, JSON.stringify(details), SANDBOX_VERIFICATION, this.now()],
    );
    return toPayout(rows[0]);
  }

  async listing(id: string, q: Queryable = this.db): Promise<Listing | undefined> {
    const { rows } = await q.query<ListingRow>(`${LISTING_SELECT} WHERE l.id = $1`, [id]);
    return rows[0] && toListing(rows[0]);
  }

  /** Listings still open before their show, soonest show first. */
  async openListings(): Promise<Listing[]> {
    const { rows } = await this.db.query<ListingRow>(
      `${LISTING_SELECT} WHERE l.status = 'open' AND l.starts_at > $1 ORDER BY l.starts_at, l.created_at`, [this.now()]);
    return rows.map(toListing);
  }

  /** A seller's listings, newest first. */
  async listingsOf(accountId: string): Promise<Listing[]> {
    const { rows } = await this.db.query<ListingRow>(`${LISTING_SELECT} WHERE l.seller_account_id = $1 ORDER BY l.created_at DESC`, [accountId]);
    return rows.map(toListing);
  }

  /** Puts valid tickets from one booking on sale. Returns the tickets that are no longer valid if any changed meanwhile. */
  async createListing(input: { sellerAccountId: string; booking: Booking; ticketIds: string[]; price: number }): Promise<{ listing: Listing } | { unavailable: string[] }> {
    const { sellerAccountId, booking, ticketIds, price } = input;
    const id = randomUUID();
    try {
      return await this.db.transaction(async (tx) => {
        const listed = await tx.query<{ id: string; seat: string }>(
          `UPDATE tickets SET status = 'listed' WHERE booking_id = $1 AND id = ANY($2) AND status = 'valid' RETURNING id, seat`,
          [booking.id, ticketIds],
        );
        if (listed.rows.length !== ticketIds.length) throw new Unavailable(ticketIds.filter((t) => !listed.rows.some((r) => r.id === t)));
        await tx.query(
          `INSERT INTO resale_listings (id, seller_account_id, booking_id, showtime_id, starts_at, price, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)`,
          [id, sellerAccountId, booking.id, booking.showtime.showtimeId, booking.showtime.startsAt, price, this.now()],
        );
        for (const t of listed.rows)
          await tx.query(`INSERT INTO resale_listing_tickets (listing_id, ticket_id, seat, state) VALUES ($1, $2, $3, 'listed')`, [id, t.id, t.seat]);
        return { listing: (await this.listing(id, tx))! };
      });
    } catch (e) {
      if (e instanceof Unavailable) return { unavailable: e.ticketIds };
      if (isUniqueViolation(e)) return { unavailable: ticketIds };
      throw e;
    }
  }

  /** Takes the unsold tickets off sale and makes them valid again. Returns the withdrawn ticket ids. */
  async withdraw(listingId: string): Promise<string[]> {
    return this.db.transaction(async (tx) => {
      const { rows } = await tx.query<{ ticket_id: string }>(
        `UPDATE resale_listing_tickets SET state = 'withdrawn' WHERE listing_id = $1 AND state = 'listed' RETURNING ticket_id`, [listingId]);
      const ids = rows.map((r) => r.ticket_id);
      if (ids.length) await tx.query(`UPDATE tickets SET status = 'valid' WHERE id = ANY($1) AND status = 'listed'`, [ids]);
      await this.closeIfDone(tx, listingId);
      return ids;
    });
  }

  /**
   * Reserves tickets for one buyer while they pay. Exactly one of several buyers racing for a ticket gets it:
   * the conditional update takes only tickets still 'listed'.
   */
  async reserve(listingId: string, ticketIds: string[], buyerAccountId: string, sale: { reference: string; buyerTotal: number; sellerPayout: number }):
    Promise<{ saleId: string } | { unavailable: string[] } | { closed: true }> {
    const saleId = randomUUID();
    try {
      return await this.db.transaction(async (tx) => {
        const now = this.now();
        const { rows: [l] } = await tx.query<{ status: string; starts_at: Date | string }>(
          'SELECT status, starts_at FROM resale_listings WHERE id = $1 FOR UPDATE', [listingId]);
        if (!l || l.status !== 'open' || new Date(l.starts_at) <= now) return { closed: true as const };
        await tx.query(
          `INSERT INTO resale_sales (id, listing_id, buyer_account_id, ticket_ids, reference, buyer_total, seller_payout, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'reserved', $8, $8)`,
          [saleId, listingId, buyerAccountId, ticketIds, sale.reference, sale.buyerTotal, sale.sellerPayout, now],
        );
        const { rows } = await tx.query<{ ticket_id: string }>(
          `UPDATE resale_listing_tickets SET state = 'reserved', sale_id = $3
            WHERE listing_id = $1 AND ticket_id = ANY($2) AND state = 'listed' RETURNING ticket_id`,
          [listingId, ticketIds, saleId],
        );
        if (rows.length !== ticketIds.length) throw new Unavailable(ticketIds.filter((t) => !rows.some((r) => r.ticket_id === t)));
        return { saleId };
      });
    } catch (e) {
      if (e instanceof Unavailable) return { unavailable: e.ticketIds };
      throw e;
    }
  }

  /** The buyer's payment failed: the tickets go back on sale. */
  async paymentFailed(saleId: string, reason: string) {
    await this.db.transaction(async (tx) => {
      await tx.query(`UPDATE resale_sales SET status = 'payment-failed', failure = $2, updated_at = $3 WHERE id = $1 AND status = 'reserved'`, [saleId, reason, this.now()]);
      await tx.query(`UPDATE resale_listing_tickets SET state = 'listed', sale_id = NULL WHERE sale_id = $1 AND state = 'reserved'`, [saleId]);
    });
  }

  /**
   * The cinema couldn't transfer the tickets after the buyer paid (BRD 11): the sale is cancelled (the caller
   * refunds the buyer) and the seller's tickets come off sale and stay valid.
   */
  async transferFailed(saleId: string, paymentRef: string, reason: string) {
    await this.db.transaction(async (tx) => {
      await tx.query(`UPDATE resale_sales SET status = 'refunded', payment_ref = $2, failure = $3, updated_at = $4 WHERE id = $1 AND status = 'reserved'`,
        [saleId, paymentRef, reason, this.now()]);
      const { rows } = await tx.query<{ listing_id: string; ticket_id: string }>(
        `UPDATE resale_listing_tickets SET state = 'returned' WHERE sale_id = $1 AND state = 'reserved' RETURNING listing_id, ticket_id`, [saleId]);
      if (!rows.length) return;
      await tx.query(`UPDATE tickets SET status = 'valid' WHERE id = ANY($1) AND status = 'listed'`, [rows.map((r) => r.ticket_id)]);
      await this.closeIfDone(tx, rows[0].listing_id);
    });
  }

  /**
   * The buyer paid and the cinema transferred the tickets: the seller's tickets become 'transferred', the buyer
   * gets a booking with the replacements, and the seller's payout is recorded as pending. False if the
   * reservation was lost meanwhile (nothing changes then).
   */
  async complete(saleId: string, paymentRef: string, booking: Booking, replacementFor: Map<string, string>): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const { rows } = await tx.query<{ listing_id: string; ticket_id: string }>(
        `SELECT listing_id, ticket_id FROM resale_listing_tickets WHERE sale_id = $1 AND state = 'reserved'`, [saleId]);
      if (rows.length !== replacementFor.size || !rows.every((r) => replacementFor.has(r.ticket_id))) return false;
      const originals = rows.map((r) => r.ticket_id);
      // Invalidate first: the replacements reuse the seats, which are unique among tickets in use.
      const moved = await tx.query(`UPDATE tickets SET status = 'transferred' WHERE id = ANY($1) AND status = 'listed' RETURNING id`, [originals]);
      if (moved.rows.length !== originals.length) throw new Error(`Resale ${saleId}: seller tickets changed during transfer`);
      await insertBooking(tx, booking);
      for (const original of originals)
        await tx.query(`UPDATE resale_listing_tickets SET state = 'sold', replacement_ticket_id = $3 WHERE sale_id = $1 AND ticket_id = $2`,
          [saleId, original, replacementFor.get(original)]);
      await tx.query(
        `UPDATE resale_sales SET status = 'completed', payout_status = 'pending', payment_ref = $2, booking_id = $3, updated_at = $4 WHERE id = $1`,
        [saleId, paymentRef, booking.id, this.now()],
      );
      await this.closeIfDone(tx, rows[0].listing_id);
      return true;
    });
  }

  /**
   * Purchases still unfinished after PURCHASE_TIMEOUT_MS were interrupted: their tickets go back on sale (and
   * close as usual if the show has started meanwhile). Returns them so support can check the payment provider
   * for a charge under that reference and refund it.
   */
  async releaseStale(): Promise<{ saleId: string; reference: string; buyerAccountId: string }[]> {
    const cutoff = new Date(this.clock() - PURCHASE_TIMEOUT_MS);
    const due = await this.db.query(`SELECT 1 FROM resale_sales WHERE status = 'reserved' AND updated_at < $1 LIMIT 1`, [cutoff]);
    if (!due.rows.length) return [];
    return this.db.transaction(async (tx) => {
      const { rows } = await tx.query<{ saleId: string; reference: string; buyerAccountId: string }>(
        `UPDATE resale_sales SET status = 'abandoned', failure = 'The purchase did not finish', updated_at = $2
          WHERE status = 'reserved' AND updated_at < $1 RETURNING id AS "saleId", reference, buyer_account_id AS "buyerAccountId"`,
        [cutoff, this.now()]);
      if (rows.length)
        await tx.query(`UPDATE resale_listing_tickets SET state = 'listed', sale_id = NULL WHERE sale_id = ANY($1) AND state = 'reserved'`,
          [rows.map((r) => r.saleId)]);
      return rows;
    });
  }

  /**
   * Closes listings whose show has started (BRD 11). Their unsold tickets become 'pending-reactivation' until the
   * cinema confirms they work again. Tickets a buyer is paying for are left to that purchase. Returns the tickets closed.
   */
  async closeStarted(): Promise<TicketRef[]> {
    const now = this.now();
    const due = await this.db.query(`SELECT 1 FROM resale_listings WHERE status = 'open' AND starts_at <= $1 LIMIT 1`, [now]);
    if (!due.rows.length) return [];
    return this.db.transaction(async (tx) => {
      const { rows } = await tx.query<{ ticket_id: string }>(
        `UPDATE resale_listing_tickets lt SET state = 'expired' FROM resale_listings l
          WHERE lt.listing_id = l.id AND l.status = 'open' AND l.starts_at <= $1 AND lt.state = 'listed' RETURNING lt.ticket_id`, [now]);
      const closed = rows.length
        ? (await tx.query<TicketRef>(
          `UPDATE tickets SET status = 'pending-reactivation' WHERE id = ANY($1) AND status = 'listed'
           RETURNING id, showtime_id AS "showtimeId", seat, qr`, [rows.map((r) => r.ticket_id)])).rows
        : [];
      const listings = await tx.query<{ id: string }>(`SELECT id FROM resale_listings WHERE status = 'open' AND starts_at <= $1`, [now]);
      for (const l of listings.rows) await this.closeIfDone(tx, l.id);
      return closed;
    });
  }

  /** Tickets from expired listings that the cinema hasn't reactivated yet. */
  async awaitingReactivation(): Promise<TicketRef[]> {
    const { rows } = await this.db.query<TicketRef>(
      `SELECT id, showtime_id AS "showtimeId", seat, qr FROM tickets WHERE status = 'pending-reactivation'`);
    return rows;
  }

  /** The cinema confirmed these tickets work again: they return to their owner. */
  async reactivated(ticketIds: string[]) {
    await this.db.query(`UPDATE tickets SET status = 'valid' WHERE id = ANY($1) AND status = 'pending-reactivation'`, [ticketIds]);
  }

  /**
   * Closes an open listing once nothing in it is for sale or being bought. Its status says why: every ticket
   * sold, some expired at showtime, some withdrawn, or otherwise closed (a failed transfer returned them).
   */
  private async closeIfDone(q: Queryable, listingId: string) {
    await q.query(
      `UPDATE resale_listings l
          SET status = CASE
                WHEN NOT EXISTS (SELECT 1 FROM resale_listing_tickets WHERE listing_id = l.id AND state <> 'sold') THEN 'sold'
                WHEN EXISTS (SELECT 1 FROM resale_listing_tickets WHERE listing_id = l.id AND state = 'expired') THEN 'expired'
                WHEN EXISTS (SELECT 1 FROM resale_listing_tickets WHERE listing_id = l.id AND state = 'withdrawn') THEN 'withdrawn'
                ELSE 'closed' END,
              closed_at = $2
        WHERE l.id = $1 AND l.status = 'open'
          AND NOT EXISTS (SELECT 1 FROM resale_listing_tickets WHERE listing_id = l.id AND state IN ('listed', 'reserved'))`,
      [listingId, this.now()],
    );
  }
}

/** Same columns as Store.saveBooking; a resale buyer's booking has no hold to turn into tickets. */
async function insertBooking(q: Queryable, b: Booking) {
  const s = b.showtime;
  await q.query(
    `INSERT INTO bookings (id, reference, showtime_id, movie_id, cinema_id, starts_at, format, ticket_price, holder,
       payment_method, price, payment_ref, cinema_confirmation, created_at, account_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [b.id, b.reference, s.showtimeId, s.movieId, s.cinemaId, s.startsAt, s.format, s.price, JSON.stringify(b.holder),
      b.paymentMethod, JSON.stringify(b.price), b.paymentRef, b.cinemaConfirmation, b.createdAt, b.accountId],
  );
  for (const t of b.tickets)
    await q.query('INSERT INTO tickets (id, booking_id, showtime_id, seat, qr, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [t.id, b.id, s.showtimeId, t.seat, t.qr, t.status]);
}
