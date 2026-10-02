import type { Booking } from './api/types';

type Booked = Pick<Booking, 'showtime' | 'showChange'>;

/**
 * When a booking's show starts: the new time if cinema staff moved it after the sale (BRD 9), else the time it
 * was sold for. Use it wherever a booking's start time matters; `booking.showtime` is the show as it was sold.
 */
export const showStartsAt = (b: Booked) => (b.showChange?.kind === 'changed' ? b.showChange.startsAt : b.showtime.startsAt);

/** The booking's show has started, at its current time. */
export const showStarted = (b: Booked) => Date.parse(showStartsAt(b)) <= Date.now();
