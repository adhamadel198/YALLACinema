// Mirrors the response shapes in apps/api/src. Move to a shared package once more screens use them.
export type Arrangement = 'connected' | 'separated' | 'either';

/** Most seats in one booking; the API enforces the same limit (apps/api/src/domain/limits.ts). */
export const MAX_SEATS_PER_BOOKING = 10;
export type Area = 'Downtown Cairo' | 'Maadi' | 'New Cairo' | '6th of October';

export interface Cinema {
  id: string;
  name: string;
  area: Area;
  detail: string;
}

/** Optional filters for GET /v1/movies/:id/showtimes (BRD 7.1). Times are "HH:MM" in Cairo. */
export interface ShowtimeFilters {
  area?: Area;
  cinemaId?: string;
  from?: string;
  to?: string;
  sort?: 'soonest' | 'distance';
  nearArea?: Area;
}

export interface Movie {
  id: string;
  title: string;
  genre: string;
  runtimeMinutes: number;
  ageRating: string;
  audienceScore: number;
  tagline: string;
  synopsis: string;
  credits: string;
  language: string;
  poster: { from: string; to: string; symbol: string };
  showtimeCount?: number;
  fromPrice?: number;
}

export interface ShowtimeResult {
  showtimeId: string;
  startsAt: string;
  localTime: string;
  price: number;
  format: string;
  cinema: { id: string; name: string; area: string; detail: string };
  distanceKm: number | null;
  matches: { connected: number; separated: number[] | null };
}

export interface ShowtimeSummary {
  showtimeId: string;
  startsAt: string;
  localTime: string;
  format: string;
  price: number;
  movie: { id: string; title: string; poster: Movie['poster'] };
  cinema: { id: string; name: string; detail: string; cancellationPolicy: string };
}

export interface SeatGroup {
  type: 'connected' | 'separated';
  pattern: number[];
  seats: string[];
}

export interface SeatMapResponse {
  showtimeId: string;
  rows: number;
  cols: number;
  unavailable: string[];
  groups: SeatGroup[];
  best: SeatGroup | null;
}

export interface Price {
  tickets: number;
  fees: number;
  total: number;
}

export interface Hold {
  id: string;
  showtimeId: string;
  seats: string[];
  expiresAt: string;
  price: Price;
  showtime?: ShowtimeSummary;
}

export type PaymentMethod = 'card' | 'wallet';
export interface Guest {
  name: string;
  email: string;
  mobile: string;
}

export interface Booking {
  id: string;
  reference: string;
  holder: Guest;
  paymentMethod: PaymentMethod;
  price: Price;
  tickets: { id: string; seat: string; qr: string; status: string }[];
  createdAt: string;
  showtime: ShowtimeSummary;
}
