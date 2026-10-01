import type { Area, Cinema, Movie, SeatMap, Showtime } from '../domain/types.ts';
import { seatId } from '../domain/seats.ts';

// Sample data carried over from the static prototype (index.html, movie.html, search.html).
// It stands in for cinema integrations until a pilot cinema's API is connected.

export const movies: Movie[] = [
  {
    id: 'the-last-light', title: 'The Last Light', genre: 'Drama', runtimeMinutes: 128, ageRating: '16+', audienceScore: 8.4,
    tagline: 'An unforgettable journey',
    synopsis: 'When a quiet coastal town loses its lighthouse, a young restorer returns home to uncover the story her family left behind. A moving, visually rich story about finding your way back.',
    credits: 'Directed by Lina Mansour · Starring Salma Hassan, Karim Nabil',
    language: 'English · Arabic subtitles',
    poster: { from: '#a14d31', to: '#402a31', symbol: '☼' },
  },
  {
    id: 'redline', title: 'Redline', genre: 'Action', runtimeMinutes: 114, ageRating: '16+', audienceScore: 7.9,
    tagline: 'No way back', synopsis: 'A getaway driver gets one last job and one night to finish it.',
    credits: 'Sample listing', language: 'English · Arabic subtitles',
    poster: { from: '#933b30', to: '#351b20', symbol: '◈' },
  },
  {
    id: 'a-little-chaos', title: 'A Little Chaos', genre: 'Comedy', runtimeMinutes: 106, ageRating: '12+', audienceScore: 8.1,
    tagline: 'Life happens', synopsis: 'A wedding planner’s own family reunion goes spectacularly off script.',
    credits: 'Sample listing', language: 'Arabic · English subtitles',
    poster: { from: '#d5a54c', to: '#765340', symbol: '✿' },
  },
  {
    id: 'the-deep-blue', title: 'The Deep Blue', genre: 'Adventure', runtimeMinutes: 136, ageRating: '12+', audienceScore: 7.7,
    tagline: 'Into the unknown', synopsis: 'A research crew follows a signal to the bottom of the Red Sea.',
    credits: 'Sample listing', language: 'English · Arabic subtitles',
    poster: { from: '#35778a', to: '#142a45', symbol: '≈' },
  },
  {
    id: 'little-giants', title: 'Little Giants', genre: 'Family', runtimeMinutes: 99, ageRating: 'All ages', audienceScore: 8.6,
    tagline: 'Big dreams start small', synopsis: 'A school football team with no pitch sets out to win the city cup.',
    credits: 'Sample listing', language: 'Arabic',
    poster: { from: '#d58248', to: '#66513c', symbol: '★' },
  },
];

export const cinemas: Cinema[] = [
  { id: 'vox-moe', name: 'VOX Cinemas · Mall of Egypt', shortName: 'VOX', area: '6th of October', detail: 'Mall of Egypt · Standard · Dolby Atmos', location: { lat: 29.972, lon: 31.016 }, cancellationPolicy: 'Tickets can be cancelled up to 3 hours before the show for a refund of the ticket price. Platform fees are non-refundable.' },
  { id: 'reel-cfc', name: 'Reel Cinemas · Cairo Festival City', shortName: 'Reel', area: 'New Cairo', detail: 'Cairo Festival City · Premium · IMAX', location: { lat: 30.029, lon: 31.408 }, cancellationPolicy: 'Tickets are non-refundable unless the cinema cancels or changes the show.' },
  { id: 'galaxy-maadi', name: 'Galaxy Cinema · Maadi', shortName: 'Galaxy', area: 'Maadi', detail: 'Maadi · Standard · Dolby sound', location: { lat: 29.96, lon: 31.26 }, cancellationPolicy: 'Tickets can be cancelled up to 24 hours before the show for a refund of the ticket price. Platform fees are non-refundable.' },
];

/** Approximate centre of each selectable area, used when the customer picks an area instead of sharing location. */
export const areaCentres: Record<Area, { lat: number; lon: number }> = {
  'Downtown Cairo': { lat: 30.044, lon: 31.236 },
  Maadi: { lat: 29.96, lon: 31.26 },
  'New Cairo': { lat: 30.03, lon: 31.47 },
  '6th of October': { lat: 29.94, lon: 30.91 },
};

const schedule: { cinemaId: string; movieId: string; times: string[]; price: number; format: string }[] = [
  { cinemaId: 'vox-moe', movieId: 'the-last-light', times: ['17:30', '19:45', '22:15'], price: 180, format: 'Dolby Atmos' },
  { cinemaId: 'vox-moe', movieId: 'redline', times: ['18:00', '20:30'], price: 190, format: 'Standard' },
  { cinemaId: 'reel-cfc', movieId: 'the-last-light', times: ['18:00', '20:30', '23:00'], price: 220, format: 'IMAX' },
  { cinemaId: 'reel-cfc', movieId: 'redline', times: ['17:00', '19:30', '22:00'], price: 210, format: 'Premium' },
  { cinemaId: 'reel-cfc', movieId: 'the-deep-blue', times: ['17:00', '19:45'], price: 205, format: 'IMAX' },
  { cinemaId: 'reel-cfc', movieId: 'a-little-chaos', times: ['18:30', '21:00'], price: 185, format: 'Premium' },
  { cinemaId: 'galaxy-maadi', movieId: 'the-last-light', times: ['17:00', '19:30', '22:00'], price: 150, format: 'Standard' },
  { cinemaId: 'galaxy-maadi', movieId: 'a-little-chaos', times: ['17:30', '20:00'], price: 160, format: 'Standard' },
  { cinemaId: 'galaxy-maadi', movieId: 'little-giants', times: ['16:30', '18:45'], price: 145, format: 'Standard' },
];

/** Deterministic pseudo-random seat occupancy so the same showtime always has the same map. */
function seatMapFor(key: string): SeatMap {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 2 ** 32);
  const rows = 8, cols = 12;
  const occupancy = 0.25 + rand() * 0.55;
  const unavailable: string[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (rand() < occupancy) unavailable.push(seatId(r, c));
  return { rows, cols, unavailable };
}

/** Today's date in Cairo plus Cairo's current UTC offset, e.g. ["2026-10-01", "+03:00"]. */
function cairoDay(now: Date): [string, string] {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', timeZoneName: 'longOffset' })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  const offset = String(parts.timeZoneName).replace('GMT', '') || '+00:00';
  return [`${parts.year}-${parts.month}-${parts.day}`, offset];
}

export function buildShowtimes(now = new Date()): Showtime[] {
  const [day, offset] = cairoDay(now);
  return schedule.flatMap((s) =>
    s.times.map((t) => {
      const id = `${s.cinemaId}_${s.movieId}_${t.replace(':', '')}`;
      return {
        id, movieId: s.movieId, cinemaId: s.cinemaId, startsAt: `${day}T${t}:00${offset}`,
        price: s.price, format: s.format, seatMap: seatMapFor(id),
      };
    }),
  );
}
