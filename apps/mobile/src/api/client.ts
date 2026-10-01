import Constants from 'expo-constants';
import type { Arrangement, Booking, Guest, Hold, Movie, PaymentMethod, SeatMapResponse, ShowtimeResult, ShowtimeSummary } from './types';

/**
 * EXPO_PUBLIC_API_URL wins. Otherwise use the machine running the Expo dev server
 * (so a phone on the same Wi-Fi works), falling back to localhost for web/simulators.
 */
function apiBase() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:4000`;
}

let language = 'en';
/** Listings come back in this language (BRD 7.1). Set by LanguageProvider. */
export const setApiLanguage = (lang: string) => { language = lang; };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body: Record<string, unknown>) {
    super(message);
  }
}

async function request<T>(path: string, init?: { method: string; body?: unknown }): Promise<T> {
  const res = await fetch(apiBase() + path, {
    method: init?.method ?? 'GET',
    headers: { 'Accept-Language': language, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status, body);
  return body as T;
}

const enc = encodeURIComponent;

export const api = {
  movies: () => request<Movie[]>('/v1/movies'),
  movie: (id: string) => request<Movie>(`/v1/movies/${enc(id)}`),
  showtimes: (id: string, count: number, arrangement: Arrangement) =>
    request<{ results: ShowtimeResult[] }>(`/v1/movies/${enc(id)}/showtimes?count=${count}&arrangement=${arrangement}`).then((r) => r.results),
  showtime: (id: string) => request<ShowtimeSummary>(`/v1/showtimes/${enc(id)}`),
  seats: (id: string, count: number, arrangement: Arrangement) =>
    request<SeatMapResponse>(`/v1/showtimes/${enc(id)}/seats?count=${count}&arrangement=${arrangement}`),
  hold: (showtimeId: string, seats: string[]) => request<Hold>('/v1/holds', { method: 'POST', body: { showtimeId, seats } }),
  getHold: (id: string) => request<Required<Hold>>(`/v1/holds/${enc(id)}`),
  releaseHold: (id: string) => request<void>(`/v1/holds/${enc(id)}`, { method: 'DELETE' }),
  book: (holdId: string, guest: Guest, paymentMethod: PaymentMethod) =>
    request<Booking>('/v1/bookings', { method: 'POST', body: { holdId, guest, paymentMethod, acceptPolicy: true } }),
  booking: (id: string) => request<Booking>(`/v1/bookings/${enc(id)}`),
};
