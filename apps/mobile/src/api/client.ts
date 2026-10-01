import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Arrangement, Booking, Cinema, ShowtimeFilters, Guest, Hold, Movie, PaymentMethod, SeatMapResponse, ShowtimeResult, ShowtimeSummary } from './types';

/**
 * EXPO_PUBLIC_API_URL wins. A built website (e.g. on Vercel) calls the API on its own address.
 * Otherwise use the machine running the Expo dev server (so a phone on the same Wi-Fi works),
 * falling back to localhost for web/simulators.
 */
function apiBase() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web' && !__DEV__) return '';
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:4000`;
}

let language = 'en';
/** Listings come back in this language (BRD 7.1). Set by LanguageProvider. */
export const setApiLanguage = (lang: string) => { language = lang; };

/**
 * A random id for this install, sent as X-Client-Id. The API uses it to give each customer one
 * checkout at a time and to rate-limit holds. It is not an identity.
 */
let clientId: Promise<string> | undefined;
function getClientId() {
  clientId ??= AsyncStorage.getItem('yalla.client')
    .catch(() => null)
    .then(async (saved) => {
      if (saved) return saved;
      const id = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      await AsyncStorage.setItem('yalla.client', id).catch(() => {});
      return id;
    });
  return clientId;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body: Record<string, unknown>) {
    super(message);
  }
}

async function request<T>(path: string, init?: { method: string; body?: unknown }): Promise<T> {
  const res = await fetch(apiBase() + path, {
    method: init?.method ?? 'GET',
    headers: {
      'Accept-Language': language,
      'X-Client-Id': await getClientId(),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
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
  cinemas: () => request<Cinema[]>('/v1/cinemas'),
  showtimes: (id: string, count: number, arrangement: Arrangement, filters: ShowtimeFilters = {}) => {
    const query = new URLSearchParams({ count: String(count), arrangement });
    for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
    return request<{ results: ShowtimeResult[] }>(`/v1/movies/${enc(id)}/showtimes?${query}`).then((r) => r.results);
  },
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
