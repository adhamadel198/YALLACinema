import Constants from 'expo-constants';
import type { Arrangement, Movie, ShowtimeResult } from './types';

/**
 * EXPO_PUBLIC_API_URL wins. Otherwise use the machine running the Expo dev server
 * (so a phone on the same Wi-Fi works), falling back to localhost for web/simulators.
 */
function apiBase() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:4000`;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(apiBase() + path);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const api = {
  movies: () => get<Movie[]>('/v1/movies'),
  movie: (id: string) => get<Movie>(`/v1/movies/${encodeURIComponent(id)}`),
  showtimes: (id: string, count: number, arrangement: Arrangement) =>
    get<{ results: ShowtimeResult[] }>(
      `/v1/movies/${encodeURIComponent(id)}/showtimes?count=${count}&arrangement=${arrangement}`,
    ).then((r) => r.results),
};
