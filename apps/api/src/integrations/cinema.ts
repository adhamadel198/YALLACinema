import type { SeatId } from '../domain/types.ts';

export type ConfirmResult = { ok: true; confirmation: string } | { ok: false; reason: string };

/** A ticket as the cinema knows it: the seat and the code scanned at the entrance. */
export type CinemaTicket = { seat: SeatId; qr: string };

/**
 * What a cinema's system must support before its tickets can be resold (BRD 11; which cinemas can is
 * open decision 12). An integration without it simply doesn't offer resale.
 */
export interface CinemaResale {
  /** Is each ticket unused and allowed to be resold? Asked before a listing is published. */
  checkEligibility(input: { showtimeId: string; tickets: CinemaTicket[] }): Promise<ConfirmResult>;
  /** Invalidates the seller's tickets and validates the buyer's replacements, all or nothing. */
  transfer(input: { showtimeId: string; reference: string; tickets: { seat: SeatId; originalQr: string; replacementQr: string }[] }): Promise<ConfirmResult>;
  /** Makes tickets from a listing that closed unsold usable again (BRD 11, open decision 18). */
  reactivate(input: { showtimeId: string; tickets: CinemaTicket[] }): Promise<ConfirmResult>;
}

/**
 * Per-cinema integration boundary (BRD 8). Each pilot cinema gets an adapter for its system;
 * listings, availability and holds are still served from the in-memory store for now.
 */
export interface CinemaIntegration {
  confirm(input: { showtimeId: string; seats: SeatId[]; reference: string }): Promise<ConfirmResult>;
  resale?: CinemaResale;
}

/** Confirms every booking. Development only. */
export const sandboxCinema: CinemaIntegration = {
  async confirm({ reference }) {
    return { ok: true, confirmation: `CIN-${reference}` };
  },
  // Every ticket is eligible and every transfer and reactivation succeeds.
  resale: {
    async checkEligibility({ showtimeId }) {
      return { ok: true, confirmation: `CIN-ELIG-${showtimeId}` };
    },
    async transfer({ reference }) {
      return { ok: true, confirmation: `CIN-${reference}` };
    },
    async reactivate({ showtimeId }) {
      return { ok: true, confirmation: `CIN-REACT-${showtimeId}` };
    },
  },
};
