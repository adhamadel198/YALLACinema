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

let authToken: string | null = null;
/** The signed-in session token, sent as `Authorization: Bearer`. Set by AuthProvider. */
export const setAuthToken = (token: string | null) => { authToken = token; };

let sessionExpired: ((token: string) => void) | undefined;
/**
 * Called with the token when a request sent with one gets 401: the API no longer knows that session (it expired,
 * or the server's data was reset). Set by AuthProvider, which signs out, so no screen has to handle it.
 */
export const onSessionExpired = (handler: typeof sessionExpired) => { sessionExpired = handler; };

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

/**
 * Calls the API. Feature modules (e.g. api/auth.ts) build on this rather than growing `api` below.
 * `token` sends that session token instead of the signed-in one.
 */
export async function request<T>(path: string, init?: { method?: string; body?: unknown; token?: string }): Promise<T> {
  const token = init?.token ?? authToken;
  const res = await fetch(apiBase() + path, {
    method: init?.method ?? 'GET',
    headers: {
      'Accept-Language': language,
      'X-Client-Id': await getClientId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && token) sessionExpired?.(token);
  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status, body);
  return body as T;
}

export const enc = encodeURIComponent;

export const api = {
  movies: () => request<Movie[]>('/v1/movies'),
  movie: (id: string) => request<Movie>(`/v1/movies/${enc(id)}`),
  cinemas: () => request<Cinema[]>('/v1/cinemas'),
  showtimes: (id: string, count: number, arrangement: Arrangement, filters: ShowtimeFilters = {}) => {
    const query = new URLSearchParams({ count: String(count), arrangement });
    for (const [key, value] of Object.entries(filters)) if (value != null && value !== '') query.set(key, String(value));
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
