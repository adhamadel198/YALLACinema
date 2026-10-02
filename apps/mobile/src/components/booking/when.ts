import { clock } from '../../format';
import type { Strings } from '../../i18n/strings';

// Show dates the way the live booking pages write them: "Today, 7:45 PM", else "Fri 2 Oct, 7:45 PM".
// A showtime's timestamp carries the cinema's UTC offset, so its date and "today" are both the cinema's.

/** Today's date (YYYY-MM-DD) at the UTC offset of an ISO timestamp. */
function todayAt(iso: string) {
  const m = iso.match(/([+-])(\d\d):(\d\d)$/);
  const offset = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  return new Date(Date.now() + offset * 60_000).toISOString().slice(0, 10);
}

/** The show is on the cinema's today. */
export const isToday = (iso: string) => iso.slice(0, 10) === todayAt(iso);

/** "Fri 2 Oct" (or the Arabic names). */
export function dayName(iso: string, t: Strings) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${t.weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${t.months[m - 1]}`;
}

/** "Today, 7:45 PM" or "Fri 2 Oct, 7:45 PM". */
export function showWhen(iso: string, t: Strings) {
  return isToday(iso) ? t.booking.today(clock(iso, t)) : t.booking.onDay(dayName(iso, t), clock(iso, t));
}

/**
 * An age rating ("16+", Arabic "+16") set in the language's own direction. It has no letters, so on its own a
 * browser would lay it out left to right and show the Arabic one as "+16".
 */
export const ageRating = (rating: string, rtl: boolean) => `${rtl ? '\u2067' : '\u2066'}${rating}\u2069`;
