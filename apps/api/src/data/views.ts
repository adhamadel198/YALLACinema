import type { Store } from './store.ts';
import type { Booking } from '../domain/types.ts';
import { localizeCinema, localizeFormat, type Lang } from './i18n.ts';

/** What the app needs to describe a showtime on seat, checkout and ticket screens. */
export function showtimeSummary(store: Store, showtimeId: string, lang: Lang = 'en') {
  const s = store.showtime(showtimeId)!;
  const movie = store.movie(s.movieId)!;
  const cinema = localizeCinema(store.cinema(s.cinemaId)!, lang);
  return {
    showtimeId: s.id, startsAt: s.startsAt, localTime: s.startsAt.slice(11, 16), format: localizeFormat(s.format, lang), price: s.price,
    movie: { id: movie.id, title: movie.title, poster: movie.poster },
    cinema: { id: cinema.id, name: cinema.name, detail: cinema.detail, cancellationPolicy: cinema.cancellationPolicy },
  };
}

export const bookingView = (store: Store, b: Booking, lang: Lang = 'en') => ({ ...b, showtime: showtimeSummary(store, b.showtimeId, lang) });
