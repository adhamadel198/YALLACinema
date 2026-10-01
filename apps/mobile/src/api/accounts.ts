import { request } from './client';
import { myBookingIds } from './myBookings';
import type { Booking } from './types';

/** Booking history for the signed-in account (BRD 5.1). Sign-in itself is in api/auth.ts. */
export const accountsApi = {
  /** The account's bookings, newest first, shaped like GET /v1/bookings/:id. */
  bookings: () => request<Booking[]>('/v1/me/bookings'),
  /** Links guest bookings that have no account yet and were made with the account's email; returns the ids it linked. */
  claim: (ids: string[]) => request<{ claimed: string[] }>('/v1/me/bookings/claim', { method: 'POST', body: { ids } }),
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Adds the guest bookings saved on this device to the account that just signed in. The API links only
 * those made with the account's email; the rest stay on this device as before. Only well-formed ids are
 * sent (one bad id would make the API refuse the whole list), and at most the API's 100.
 */
export async function claimDeviceBookings() {
  const ids = (await myBookingIds()).filter((id) => typeof id === 'string' && uuid.test(id)).slice(0, 100);
  return ids.length ? (await accountsApi.claim(ids)).claimed : [];
}
