import type { Store } from './store.ts';
import type { Booking } from '../domain/types.ts';

/** What the app needs to describe a showtime on seat, checkout and ticket screens. */
export function showtimeSummary(store: Store, showtimeId: string) {
  const s = store.showtime(showtimeId)!;
  const movie = store.movie(s.movieId)!;
  const cinema = store.cinema(s.cinemaId)!;
  return {
    showtimeId: s.id, startsAt: s.startsAt, localTime: s.startsAt.slice(11, 16), format: s.format, price: s.price,
    movie: { id: movie.id, title: movie.title, poster: movie.poster },
    cinema: { id: cinema.id, name: cinema.name, detail: cinema.detail, cancellationPolicy: cinema.cancellationPolicy },
  };
}

export const bookingView = (store: Store, b: Booking) => ({ ...b, showtime: showtimeSummary(store, b.showtimeId) });
