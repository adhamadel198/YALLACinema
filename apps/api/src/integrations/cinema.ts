import type { SeatId } from '../domain/types.ts';

export type ConfirmResult = { ok: true; confirmation: string } | { ok: false; reason: string };

/**
 * Per-cinema integration boundary (BRD 8). Each pilot cinema gets an adapter for its system;
 * listings, availability and holds are still served from the in-memory store for now.
 */
export interface CinemaIntegration {
  confirm(input: { showtimeId: string; seats: SeatId[]; reference: string }): Promise<ConfirmResult>;
}

/** Confirms every booking. Development only. */
export const sandboxCinema: CinemaIntegration = {
  async confirm({ reference }) {
    return { ok: true, confirmation: `CIN-${reference}` };
  },
};
