// Mirrors the response shapes in apps/api/src. Move to a shared package once more screens use them.
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
