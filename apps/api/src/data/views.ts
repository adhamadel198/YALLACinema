import type { Store } from './store.ts';
import type { Booking, Showtime, ShowtimeSnapshot } from '../domain/types.ts';
import { localizeCinema, localizeFormat, type Lang } from './i18n.ts';

export const snapshotOf = (s: Showtime): ShowtimeSnapshot =>
  ({ showtimeId: s.id, movieId: s.movieId, cinemaId: s.cinemaId, startsAt: s.startsAt, format: s.format, price: s.price });

/** What the app needs to describe a showtime on seat, checkout and ticket screens. */
export function showtimeSummary(store: Store, s: ShowtimeSnapshot, lang: Lang = 'en') {
  const movie = store.movie(s.movieId)!;
  const cinema = localizeCinema(store.cinema(s.cinemaId)!, lang);
  return {
    showtimeId: s.showtimeId, startsAt: s.startsAt, localTime: s.startsAt.slice(11, 16), format: localizeFormat(s.format, lang), price: s.price,
    movie: { id: movie.id, title: movie.title, poster: movie.poster },
    cinema: { id: cinema.id, name: cinema.name, detail: cinema.detail, cancellationPolicy: cinema.cancellationPolicy },
  };
}

export const bookingView = (store: Store, b: Booking, lang: Lang = 'en') => ({ ...b, showtime: showtimeSummary(store, b.showtime, lang) });

/** A booking as its holder sees it, with any change the cinema made to the show after it was sold (BRD 9). */
export async function holderBookingView(store: Store, b: Booking, lang: Lang = 'en') {
  return { ...bookingView(store, b, lang), showChange: (await store.corrections?.showChange(b, lang)) ?? null };
}
