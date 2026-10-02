import { enc, request } from './client';
import type { PaymentMethod, Price } from './types';

// Cinema operator portal (BRD 5.2, 7.5, 9). Mirrors apps/api/src/routes/operator.ts.

export type TicketStatus = 'valid' | 'listed' | 'pending-reactivation' | 'transferred' | 'used' | 'under-review';

/** A booking as cinema staff see it: no contact details, payment references or ticket codes. */
export interface StaffBooking {
  reference: string;
  showtimeId: string;
  movieId: string;
  cinemaId: string;
  holderName: string;
  seats: string[];
  tickets: { seat: string; status: TicketStatus }[];
  price: Price;
  paymentMethod: PaymentMethod;
  createdAt: string;
  /** The show as it was sold. */
  sold: { startsAt: string; format: string; price: number };
}

export interface Totals { bookings: number; tickets: number; ticketRevenue: number; fees: number }

/** A show as staff see it: what customers see now, and what the cinema listed. */
export interface StaffShow {
  id: string;
  movie: { id: string; title: string };
  startsAt: string;
  localTime: string;
  format: string;
  price: number;
  cancelled: boolean;
  /** Staff changed its price, format or time. */
  corrected: boolean;
  /** Only today's listings can be corrected. */
  editable: boolean;
  listed: { startsAt: string; localTime: string; format: string; price: number } | null;
  seatsLeft: number | null;
  bookings: StaffBooking[];
  totals: Totals;
}

export interface StaffDay {
  cinema: { id: string; name: string };
  day: string;
  today: string;
  /** Today and the days with bookings, newest first. */
  days: string[];
  formats: string[];
  shows: StaffShow[];
  totals: Totals & { shows: number; cancelled: number };
}

type ShowState = { startsAt: string; format: string; price: number; cancelled: boolean };
export interface ChangeRecord {
  kind: 'changed' | 'cancelled' | 'reinstated';
  at: string;
  by: string | null;
  before: ShowState;
  after: ShowState;
  /** Bookings whose show moved, changed format, was cancelled or reinstated. */
  affected: { reference: string; holderName: string; notifiedAt: string | null }[];
}

export interface StaffShowDetail { show: StaffShow; formats: string[]; maxPrice: number; changes: ChangeRecord[] }

/** `time` is "HH:MM" on the show's day; `cancelled: false` reinstates. */
export type Correction = { price?: number; format?: string; time?: string; cancelled?: boolean };

/** On a customer's ticket (GET /v1/bookings/:id) when the cinema changed or cancelled the show after they booked. */
export type ShowChange =
  | { kind: 'cancelled'; at: string }
  | { kind: 'changed'; at: string; startsAt: string; localTime: string; format: string; changed: ('time' | 'format')[] };

export const operatorApi = {
  /** Demo staff sign-ins; only the development database has them (404 elsewhere). */
  demoAccounts: () => request<{ password: string; accounts: { cinemaId: string; cinemaName: string; email: string }[] }>('/v1/operator/demo-accounts'),
  /** The cinema's shows on a day (today by default) with their bookings. */
  day: (day?: string) => request<StaffDay>(`/v1/operator/bookings${day ? `?day=${enc(day)}` : ''}`),
  /** 404: no such booking; 403: another cinema's. */
  find: (reference: string) =>
    request<{ booking: StaffBooking; show: Omit<StaffShow, 'bookings' | 'totals' | 'seatsLeft'> }>(`/v1/operator/bookings/${enc(reference)}`),
  show: (id: string) => request<StaffShowDetail>(`/v1/operator/showtimes/${enc(id)}`),
  correct: (id: string, fix: Correction) =>
    request<{ show: StaffShow; change: { id: string; kind: ChangeRecord['kind']; affectedBookings: number } | null }>(
      `/v1/operator/showtimes/${enc(id)}`, { method: 'PATCH', body: fix }),
};
