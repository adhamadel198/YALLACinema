import { randomUUID } from 'node:crypto';
import type { FastifyBaseLogger, FastifyInstance, FastifyRequest } from 'fastify';
import type { Auth } from '../auth.ts';
import type { Accounts } from '../data/accounts.ts';
import type { Listing, PayoutDetails, Resale, TicketRef } from '../data/resale.ts';
import type { Store } from '../data/store.ts';
import { bookingView, showtimeSummary } from '../data/views.ts';
import { langOf, type Lang } from '../data/i18n.ts';
import { MAX_SEATS_PER_BOOKING } from '../domain/limits.ts';
import { bookingTotal, PLATFORM_FEE_PER_TICKET, RESALE_SELLER_FEE, resaleQuote } from '../domain/pricing.ts';
import type { Booking, PaymentMethod } from '../domain/types.ts';
import type { PaymentProvider } from '../integrations/payments.ts';
import type { CinemaIntegration } from '../integrations/cinema.ts';
import { bookingReference, clientIdOf } from './booking.ts';
import { nameSchema, uuidParams } from './schemas.ts';

type Deps = { store: Store; accounts: Accounts; auth: Auth; payments: PaymentProvider; cinema: CinemaIntegration; resale: Resale };

const limit = (max: number) => ({ rateLimit: { max, timeWindow: '10 minutes', keyGenerator: clientIdOf } });
const ticketIdsSchema = { type: 'array', minItems: 1, maxItems: MAX_SEATS_PER_BOOKING, uniqueItems: true, items: { type: 'string', format: 'uuid' } } as const;

/** What anyone browsing the marketplace sees: no seller details, only the tickets still for sale. */
function marketView(store: Store, l: Listing, lang: Lang, viewerId: string | undefined) {
  return {
    id: l.id, showtime: showtimeSummary(store, l.showtime, lang),
    price: l.price, fee: PLATFORM_FEE_PER_TICKET, buyerPays: resaleQuote(l.price, l.showtime.price).buyerPays,
    tickets: l.tickets.filter((t) => t.state === 'listed').map(({ ticketId, seat }) => ({ ticketId, seat })),
    mine: l.sellerAccountId === viewerId,
  };
}

/** What the seller sees: every ticket's outcome, what they receive per ticket, and payouts owed. */
function sellerView(store: Store, l: Listing, lang: Lang) {
  const quote = resaleQuote(l.price, l.showtime.price);
  return {
    id: l.id, bookingId: l.bookingId, status: l.status, createdAt: l.createdAt, closedAt: l.closedAt,
    showtime: showtimeSummary(store, l.showtime, lang),
    price: l.price, buyerPays: quote.buyerPays, sellerReceives: quote.sellerReceives, sellerFee: RESALE_SELLER_FEE,
    tickets: l.tickets, pendingPayout: l.pendingPayout,
  };
}

/**
 * Listings close when their show starts (BRD 11). Like holds, this happens lazily, before requests that show
 * tickets or listings. Unsold tickets stay 'pending-reactivation' until the cinema confirms they work again,
 * so the seller and a buyer can never both use one; until then support is alerted through the log.
 */
export function resaleSweep(resale: Resale, cinema: CinemaIntegration, log: FastifyBaseLogger) {
  let running: Promise<void> | undefined;
  let lastRetry = -Infinity;
  const reactivate = async (tickets: TicketRef[]) => {
    const byShow = new Map<string, TicketRef[]>();
    for (const t of tickets) byShow.set(t.showtimeId, [...(byShow.get(t.showtimeId) ?? []), t]);
    for (const [showtimeId, group] of byShow) {
      const result = cinema.resale
        ? await cinema.resale.reactivate({ showtimeId, tickets: group.map(({ seat, qr }) => ({ seat, qr })) })
          .catch((e: Error) => ({ ok: false as const, reason: e.message }))
        : { ok: false as const, reason: 'This cinema integration has no resale support' };
      if (result.ok) await resale.reactivated(group.map((t) => t.id));
      else log.warn({ showtimeId, seats: group.map((t) => t.seat), reason: result.reason },
        'Resale: the cinema has not reactivated unsold tickets from a closed listing. Tell the owners and support.');
    }
  };
  const sweep = async () => {
    for (const sale of await resale.releaseStale())
      log.error(sale, 'Resale: a purchase did not finish, so its tickets went back on sale. Check the payment provider for a charge under this reference and refund it.');
    const closed = await resale.closeStarted();
    // Tickets the cinema didn't reactivate are retried at most once a minute.
    const now = resale.now().getTime();
    if (now - lastRetry >= 60_000) {
      lastRetry = now;
      await reactivate(await resale.awaitingReactivation());
    } else if (closed.length) {
      await reactivate(closed);
    }
  };
  const run = () => (running ??= sweep().catch((e) => log.error(e, 'Resale: closing started listings failed')).finally(() => { running = undefined; }));
  return async (req: FastifyRequest) => {
    if (/^\/v1\/(bookings|resale|me)(\/|\?|$)/.test(req.url)) await run();
  };
}

/** Resale marketplace (BRD 11). Fees are in domain/pricing.ts; data access in data/resale.ts. */
export async function resaleRoutes(app: FastifyInstance, { store, auth, payments, cinema, resale }: Deps) {
  const showStarted = (startsAt: string) => Date.parse(startsAt) <= resale.now().getTime();

  /** Open listings, soonest show first. Browsing needs no account (BRD 7.1); buying does. */
  app.get('/v1/resale/listings', async (req) => {
    const viewer = (await auth.accountOf(req))?.id;
    return (await resale.openListings()).map((l) => marketView(store, l, langOf(req), viewer)).filter((l) => l.tickets.length);
  });

  app.get<{ Params: { id: string } }>('/v1/resale/listings/:id', { schema: { params: uuidParams } }, async (req, reply) => {
    const listing = await resale.listing(req.params.id);
    if (!listing) return reply.code(404).send({ error: 'Listing not found', code: 'not-found' });
    if (listing.status !== 'open' || showStarted(listing.showtime.startsAt)) return reply.code(410).send({ error: 'This listing has closed.', code: 'closed' });
    return marketView(store, listing, langOf(req), (await auth.accountOf(req))?.id);
  });

  app.get('/v1/resale/my-listings', { preHandler: auth.requireAccount }, async (req) => {
    const seller = await auth.account(req);
    return (await resale.listingsOf(seller.id)).map((l) => sellerView(store, l, langOf(req)));
  });

  app.get('/v1/resale/payout-method', { preHandler: auth.requireAccount }, async (req) =>
    ({ payoutMethod: await resale.payoutMethod((await auth.account(req)).id) }));

  /** Sellers add payout details before listing (BRD 11). Stored unverified until a verification provider exists. */
  app.post<{ Body: PayoutDetails }>('/v1/resale/payout-method', {
    preHandler: auth.requireAccount,
    config: limit(10),
    schema: {
      body: {
        type: 'object', required: ['kind'],
        properties: {
          kind: { type: 'string', enum: ['wallet', 'bank'] },
          mobile: { type: 'string', pattern: '^\\+?[0-9 ]{10,16}$' },
          bankName: nameSchema,
          accountName: nameSchema,
          accountNumber: { type: 'string', pattern: '^[A-Za-z0-9 ]{6,40}$' },
        },
        allOf: [
          { if: { properties: { kind: { const: 'wallet' } } }, then: { required: ['mobile'] } },
          { if: { properties: { kind: { const: 'bank' } } }, then: { required: ['bankName', 'accountName', 'accountNumber'] } },
        ],
      },
    },
  }, async (req) => {
    const b = req.body;
    const details: PayoutDetails = b.kind === 'wallet'
      ? { kind: 'wallet', mobile: b.mobile.replace(/\s/g, '') }
      : { kind: 'bank', bankName: b.bankName.trim(), accountName: b.accountName.trim(), accountNumber: b.accountNumber.replace(/\s/g, '').toUpperCase() };
    return { payoutMethod: await resale.setPayoutMethod((await auth.account(req)).id, details) };
  });

  /**
   * List some or all valid tickets from a booking the seller's account owns, at most what they paid per ticket
   * excluding fees, until the show starts. The cinema checks eligibility before the listing is published.
   */
  app.post<{ Body: { bookingId: string; ticketIds: string[]; price: number } }>('/v1/resale/listings', {
    preHandler: auth.requireAccount,
    config: limit(30),
    schema: {
      body: {
        type: 'object', required: ['bookingId', 'ticketIds', 'price'],
        properties: { bookingId: { type: 'string', format: 'uuid' }, ticketIds: ticketIdsSchema, price: { type: 'integer', minimum: 1, maximum: 100000 } },
      },
    },
  }, async (req, reply) => {
    const seller = await auth.account(req);
    const { bookingId, ticketIds, price } = req.body;
    if (!(await resale.payoutMethod(seller.id)))
      return reply.code(409).send({ error: 'Add payout details to your account before listing a ticket.', code: 'payout-required' });
    const booking = await store.booking(bookingId);
    if (!booking) return reply.code(404).send({ error: 'Booking not found', code: 'not-found' });
    if (booking.accountId !== seller.id)
      return reply.code(403).send({ error: 'Only tickets booked with your account can be resold.', code: 'not-owner' });
    if (showStarted(booking.showtime.startsAt))
      return reply.code(409).send({ error: 'The show has started, so these tickets can no longer be listed.', code: 'show-started' });
    if (price > booking.showtime.price)
      return reply.code(400).send({ error: `The price can be at most ${booking.showtime.price} EGP, what you paid per ticket excluding fees.`, code: 'price-cap', maxPrice: booking.showtime.price });
    const tickets = ticketIds.map((id) => booking.tickets.find((t) => t.id === id));
    if (tickets.some((t) => !t)) return reply.code(400).send({ error: 'Those tickets are not in this booking.', code: 'not-in-booking' });
    const ineligible = tickets.filter((t) => t!.status !== 'valid').map((t) => ({ ticketId: t!.id, seat: t!.seat, status: t!.status }));
    if (ineligible.length)
      return reply.code(409).send({ error: 'Only unused tickets that are not already listed or transferred can be resold.', code: 'ineligible', tickets: ineligible });
    if (!cinema.resale) return reply.code(409).send({ error: 'This cinema does not support resale yet.', code: 'cinema-unsupported' });

    const check = await cinema.resale.checkEligibility({ showtimeId: booking.showtime.showtimeId, tickets: tickets.map((t) => ({ seat: t!.seat, qr: t!.qr })) });
    if (!check.ok) return reply.code(409).send({ error: 'The cinema says these tickets cannot be resold.', code: 'cinema-ineligible', reason: check.reason });

    const created = await resale.createListing({ sellerAccountId: seller.id, booking, ticketIds, price });
    if ('unavailable' in created)
      return reply.code(409).send({ error: 'Only unused tickets that are not already listed or transferred can be resold.', code: 'ineligible', tickets: created.unavailable.map((ticketId) => ({ ticketId })) });
    return reply.code(201).send(sellerView(store, created.listing, langOf(req)));
  });

  /** The seller takes the unsold tickets off sale; they are valid again straight away. */
  app.delete<{ Params: { id: string } }>('/v1/resale/listings/:id', { preHandler: auth.requireAccount, schema: { params: uuidParams } }, async (req, reply) => {
    const seller = await auth.account(req);
    const listing = await resale.listing(req.params.id);
    if (!listing || listing.sellerAccountId !== seller.id) return reply.code(404).send({ error: 'Listing not found', code: 'not-found' });
    if (listing.status !== 'open') return reply.code(409).send({ error: 'This listing has already closed.', code: 'closed' });
    const withdrawn = await resale.withdraw(listing.id);
    if (!withdrawn.length) return reply.code(409).send({ error: 'Someone is buying these tickets right now. Try again in a minute.', code: 'busy' });
    return sellerView(store, (await resale.listing(listing.id))!, langOf(req));
  });

  /**
   * Buy tickets from a listing (BRD 11): the buyer pays the price plus the 5 EGP fee per ticket; the cinema
   * invalidates the seller's tickets and validates replacements in a new booking for the buyer; the seller's
   * payout (price less 20 EGP, never below zero) is recorded as pending. A failed transfer refunds the buyer
   * and leaves the seller's tickets valid.
   */
  app.post<{ Params: { id: string }; Body: { ticketIds: string[]; paymentMethod: PaymentMethod } }>('/v1/resale/listings/:id/purchase', {
    preHandler: auth.requireAccount,
    config: limit(20),
    schema: {
      params: uuidParams,
      body: {
        type: 'object', required: ['ticketIds', 'paymentMethod'],
        properties: { ticketIds: ticketIdsSchema, paymentMethod: { type: 'string', enum: ['card', 'wallet'] } },
      },
    },
  }, async (req, reply) => {
    const buyer = await auth.account(req);
    const { ticketIds, paymentMethod } = req.body;
    const listing = await resale.listing(req.params.id);
    if (!listing) return reply.code(404).send({ error: 'Listing not found', code: 'not-found' });
    if (listing.sellerAccountId === buyer.id) return reply.code(403).send({ error: 'You can’t buy your own listing.', code: 'own-listing' });
    if (listing.status !== 'open' || showStarted(listing.showtime.startsAt)) return reply.code(410).send({ error: 'This listing has closed.', code: 'closed' });
    if (!cinema.resale) return reply.code(409).send({ error: 'This cinema does not support resale yet.', code: 'cinema-unsupported' });
    const unknown = ticketIds.filter((id) => !listing.tickets.some((t) => t.ticketId === id));
    if (unknown.length) return reply.code(409).send({ error: 'Those tickets are not in this listing.', code: 'unavailable', ticketIds: unknown });

    const quote = resaleQuote(listing.price, listing.showtime.price);
    const price = bookingTotal(listing.price, ticketIds.length);
    const reference = bookingReference();
    // Only one buyer can reserve a ticket; everyone else racing for it stops here, before paying.
    const reserved = await resale.reserve(listing.id, ticketIds, buyer.id, { reference, buyerTotal: price.total, sellerPayout: quote.sellerReceives * ticketIds.length });
    if ('closed' in reserved) return reply.code(410).send({ error: 'This listing has closed.', code: 'closed' });
    if ('unavailable' in reserved)
      return reply.code(409).send({ error: 'Someone else just bought those tickets.', code: 'unavailable', ticketIds: reserved.unavailable });

    const charge = await payments.charge({ amount: price.total, currency: 'EGP', method: paymentMethod, reference });
    if (!charge.ok) {
      await resale.paymentFailed(reserved.saleId, charge.reason);
      return reply.code(402).send({ error: 'Payment failed. You have not been charged.', code: 'payment-failed', reason: charge.reason });
    }

    const sellerBooking = (await store.booking(listing.bookingId))!;
    const originals = ticketIds.map((id) => sellerBooking.tickets.find((t) => t.id === id)!);
    const replacements = originals.map((t) => ({ original: t, id: randomUUID(), qr: `YALLA:${reference}:${t.seat}` }));
    const refund = async (reason: string) => {
      try {
        await payments.refund(charge.paymentRef);
      } finally {
        await resale.transferFailed(reserved.saleId, charge.paymentRef, reason);
      }
      return reply.code(409).send({ error: 'The cinema could not transfer these tickets. You have been refunded.', code: 'transfer-failed' });
    };

    const transfer = await cinema.resale.transfer({
      showtimeId: listing.showtime.showtimeId, reference,
      tickets: replacements.map((r) => ({ seat: r.original.seat, originalQr: r.original.qr, replacementQr: r.qr })),
    }).catch((e: Error) => ({ ok: false as const, reason: e.message }));
    if (!transfer.ok) return refund(transfer.reason);

    const booking: Booking = {
      id: randomUUID(), reference, showtime: { ...listing.showtime, price: listing.price },
      holder: { name: buyer.name, email: buyer.email, mobile: buyer.mobile }, accountId: buyer.id, paymentMethod,
      price, paymentRef: charge.paymentRef, cinemaConfirmation: transfer.confirmation,
      tickets: replacements.map((r) => ({ id: r.id, seat: r.original.seat, qr: r.qr, status: 'valid' as const })),
      createdAt: resale.now().toISOString(),
    };
    const done = await resale.complete(reserved.saleId, charge.paymentRef, booking, new Map(replacements.map((r) => [r.original.id, r.id])))
      .catch((e) => { req.log.error(e); return false; });
    if (!done) {
      // The cinema already moved the tickets; support has to reconcile them with the cinema by hand.
      req.log.error({ saleId: reserved.saleId, reference }, 'Resale: transfer confirmed by the cinema but not recorded; buyer refunded');
      return refund('Transfer could not be recorded');
    }
    return reply.code(201).send(bookingView(store, booking, langOf(req)));
  });
}
