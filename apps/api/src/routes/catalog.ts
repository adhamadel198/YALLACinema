import type { FastifyInstance } from 'fastify';
import type { Store } from '../data/store.ts';
import { areaCentres } from '../data/seed.ts';
import { showtimeSummary } from '../data/views.ts';
import { langOf, localizeCinema, localizeFormat, localizeMovie } from '../data/i18n.ts';
import { bestGroup, findSeatGroups } from '../domain/seats.ts';
import type { Area, Arrangement } from '../domain/types.ts';

const arrangements = ['connected', 'separated', 'either'] as const;
const areas = Object.keys(areaCentres) as Area[];

function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180, R = 6371;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)) * 10) / 10;
}

/** "HH:MM" of an ISO timestamp, read from its own offset (Cairo local time). */
const localTime = (iso: string) => iso.slice(11, 16);

export async function catalogRoutes(app: FastifyInstance, { store }: { store: Store }) {
  app.get('/v1/cinemas', async (req) => store.cinemas.map((c) => localizeCinema(c, langOf(req))));

  app.get<{ Querystring: { genre?: string; q?: string } }>('/v1/movies', {
    schema: { querystring: { type: 'object', properties: { genre: { type: 'string' }, q: { type: 'string' } } } },
  }, async (req) => {
    const q = req.query.q?.trim().toLowerCase();
    return store.movies
      .filter((m) => !req.query.genre || m.genre === req.query.genre)
      .filter((m) => !q || m.title.toLowerCase().includes(q))
      .map((m) => ({
        ...localizeMovie(m, langOf(req)),
        showtimeCount: store.showtimes.filter((s) => s.movieId === m.id).length,
        fromPrice: Math.min(...store.showtimes.filter((s) => s.movieId === m.id).map((s) => s.price)),
      }));
  });

  app.get<{ Params: { id: string } }>('/v1/movies/:id', async (req, reply) => {
    const movie = store.movie(req.params.id);
    return movie ? localizeMovie(movie, langOf(req)) : reply.code(404).send({ error: 'Movie not found' });
  });

  type ShowtimeQuery = {
    count: number; arrangement: Arrangement; area?: Area; cinemaId?: string;
    from?: string; to?: string; sort: 'soonest' | 'distance'; nearArea?: Area; lat?: number; lon?: number;
  };

  /** Movie-first, seat-group search (BRD 7.1): only showtimes that can seat the request exactly. */
  app.get<{ Params: { id: string }; Querystring: ShowtimeQuery }>('/v1/movies/:id/showtimes', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          count: { type: 'integer', minimum: 1, default: 2 },
          arrangement: { type: 'string', enum: arrangements, default: 'either' },
          area: { type: 'string', enum: areas },
          cinemaId: { type: 'string' },
          from: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          to: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          sort: { type: 'string', enum: ['soonest', 'distance'], default: 'soonest' },
          nearArea: { type: 'string', enum: areas },
          lat: { type: 'number' },
          lon: { type: 'number' },
        },
      },
    },
  }, async (req, reply) => {
    const movie = store.movie(req.params.id);
    if (!movie) return reply.code(404).send({ error: 'Movie not found' });
    const { count, arrangement, area, cinemaId, from, to, sort, nearArea, lat, lon } = req.query;
    const lang = langOf(req);
    const origin = lat != null && lon != null ? { lat, lon } : nearArea ? areaCentres[nearArea] : undefined;

    const results = store.showtimes
      .filter((s) => s.movieId === movie.id)
      .filter((s) => !cinemaId || s.cinemaId === cinemaId)
      .filter((s) => !from || localTime(s.startsAt) >= from)
      .filter((s) => !to || localTime(s.startsAt) <= to)
      .flatMap((s) => {
        const cinema = localizeCinema(store.cinema(s.cinemaId)!, lang);
        if (area && cinema.area !== area) return [];
        const groups = findSeatGroups(s.seatMap, count, arrangement, store.heldSeats(s.id));
        if (!groups.length) return [];
        return [{
          showtimeId: s.id, startsAt: s.startsAt, localTime: localTime(s.startsAt), price: s.price, format: localizeFormat(s.format, lang),
          cinema: { id: cinema.id, name: cinema.name, area: cinema.area, detail: cinema.detail },
          distanceKm: origin ? km(origin, cinema.location) : null,
          matches: {
            connected: groups.filter((g) => g.type === 'connected').length,
            separated: groups.find((g) => g.type === 'separated')?.pattern ?? null,
          },
        }];
      });

    results.sort((a, b) =>
      sort === 'distance' && a.distanceKm != null && b.distanceKm != null
        ? a.distanceKm - b.distanceKm || a.startsAt.localeCompare(b.startsAt)
        : a.startsAt.localeCompare(b.startsAt));
    return { movieId: movie.id, request: { count, arrangement }, results };
  });

  app.get<{ Params: { id: string } }>('/v1/showtimes/:id', async (req, reply) =>
    store.showtime(req.params.id) ? showtimeSummary(store, req.params.id, langOf(req)) : reply.code(404).send({ error: 'Showtime not found' }));

  /** Seat map with the matching groups and the highlighted best group. */
  app.get<{ Params: { id: string }; Querystring: { count: number; arrangement: Arrangement } }>('/v1/showtimes/:id/seats', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          count: { type: 'integer', minimum: 1, default: 2 },
          arrangement: { type: 'string', enum: arrangements, default: 'either' },
        },
      },
    },
  }, async (req, reply) => {
    const s = store.showtime(req.params.id);
    if (!s) return reply.code(404).send({ error: 'Showtime not found' });
    const held = store.heldSeats(s.id);
    const groups = findSeatGroups(s.seatMap, req.query.count, req.query.arrangement, held);
    return {
      showtimeId: s.id, rows: s.seatMap.rows, cols: s.seatMap.cols,
      unavailable: [...s.seatMap.unavailable, ...held],
      groups, best: bestGroup(groups, s.seatMap) ?? null,
    };
  });
}
