import { enc, request } from './client';
import type { Booking, PaymentMethod, ShowtimeSummary } from './types';

// Resale marketplace (BRD 11). Mirrors apps/api/src/routes/resale.ts.

/** Fees from apps/api/src/domain/pricing.ts, used to show totals before the API is asked. */
export const RESALE_BUYER_FEE = 5;
export const RESALE_SELLER_FEE = 20;
export const sellerReceives = (price: number) => Math.max(0, price - RESALE_SELLER_FEE);

/** An open listing as buyers see it: only the tickets still for sale. */
export interface MarketListing {
  id: string;
  showtime: ShowtimeSummary;
  /** Per ticket, before the buyer's fee. */
  price: number;
  fee: number;
  /** Per ticket: price + fee. */
  buyerPays: number;
  tickets: { ticketId: string; seat: string }[];
  /** The signed-in viewer is the seller. */
  mine: boolean;
}

export type ListingStatus = 'open' | 'sold' | 'withdrawn' | 'expired' | 'closed';
export type ListedTicketState = 'listed' | 'reserved' | 'sold' | 'withdrawn' | 'expired' | 'returned';
export type TicketStatus = 'valid' | 'listed' | 'pending-reactivation' | 'transferred' | 'used';

/** A listing as its seller sees it. */
export interface MyListing {
  id: string;
  bookingId: string;
  status: ListingStatus;
  createdAt: string;
  closedAt: string | null;
  showtime: ShowtimeSummary;
  price: number;
  buyerPays: number;
  /** Per ticket, after the 20 EGP resale fee; never below zero. */
  sellerReceives: number;
  sellerFee: number;
  tickets: { ticketId: string; seat: string; state: ListedTicketState; ticketStatus: TicketStatus }[];
  /** Owed for tickets sold from this listing, not paid out yet. */
  pendingPayout: number;
}

export type PayoutDetails =
  | { kind: 'wallet'; mobile: string }
  | { kind: 'bank'; bankName: string; accountName: string; accountNumber: string };

export interface PayoutMethod {
  kind: PayoutDetails['kind'];
  /** Masked, e.g. "•••• 5678". */
  label: string;
  /** No verification provider yet, so every method is 'unverified-sandbox' for now. */
  verification: 'unverified-sandbox' | 'verified';
  updatedAt: string;
}

export const resaleApi = {
  listings: () => request<MarketListing[]>('/v1/resale/listings'),
  listing: (id: string) => request<MarketListing>(`/v1/resale/listings/${enc(id)}`),
  myListings: () => request<MyListing[]>('/v1/resale/my-listings'),
  payoutMethod: () => request<{ payoutMethod: PayoutMethod | null }>('/v1/resale/payout-method').then((r) => r.payoutMethod),
  setPayoutMethod: (details: PayoutDetails) =>
    request<{ payoutMethod: PayoutMethod }>('/v1/resale/payout-method', { method: 'POST', body: details }).then((r) => r.payoutMethod),
  list: (bookingId: string, ticketIds: string[], price: number) =>
    request<MyListing>('/v1/resale/listings', { method: 'POST', body: { bookingId, ticketIds, price } }),
  withdraw: (id: string) => request<MyListing>(`/v1/resale/listings/${enc(id)}`, { method: 'DELETE' }),
  buy: (id: string, ticketIds: string[], paymentMethod: PaymentMethod) =>
    request<Booking>(`/v1/resale/listings/${enc(id)}/purchase`, { method: 'POST', body: { ticketIds, paymentMethod } }),
};
