export type Area = 'Downtown Cairo' | 'Maadi' | 'New Cairo' | '6th of October';
export type Arrangement = 'connected' | 'separated' | 'either';

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
}

export interface Cinema {
  id: string;
  name: string;
  shortName: string;
  area: Area;
  detail: string;
  location: { lat: number; lon: number };
  /** Shown before purchase (BRD 9). Sample wording until each cinema's real policy is agreed. */
  cancellationPolicy: string;
}

/** A seat id is the row letter plus 1-based column, e.g. "D7". */
export type SeatId = string;

export interface SeatMap {
  rows: number;
  cols: number;
  /** Seats sold or otherwise unavailable at the cinema. */
  unavailable: SeatId[];
}

export interface Showtime {
  id: string;
  movieId: string;
  cinemaId: string;
  startsAt: string; // ISO timestamp
  /** Cinema ticket price in EGP, before the platform fee. */
  price: number;
  format: string;
  seatMap: SeatMap;
}

export interface SeatGroup {
  type: 'connected' | 'separated';
  /** Block sizes, e.g. [2, 2] for a 2+2 separated match. */
  pattern: number[];
  seats: SeatId[];
}

export interface Hold {
  id: string;
  showtimeId: string;
  seats: SeatId[];
  expiresAt: string;
}

export type PaymentMethod = 'card' | 'wallet';

export interface Guest {
  name: string;
  email: string;
  mobile: string;
}

export interface Ticket {
  id: string;
  seat: SeatId;
  /** What the cinema scans at the entrance. */
  qr: string;
  status: 'valid' | 'listed' | 'pending-reactivation' | 'transferred' | 'used';
}

/** The showtime as sold, kept with the booking so tickets still read correctly after the listing changes. */
export interface ShowtimeSnapshot {
  showtimeId: string;
  movieId: string;
  cinemaId: string;
  startsAt: string;
  format: string;
  price: number;
}

export interface Booking {
  id: string;
  reference: string;
  showtime: ShowtimeSnapshot;
  holder: Guest;
  paymentMethod: PaymentMethod;
  price: { tickets: number; fees: number; total: number };
  paymentRef: string;
  cinemaConfirmation: string;
  tickets: Ticket[];
  createdAt: string;
}
