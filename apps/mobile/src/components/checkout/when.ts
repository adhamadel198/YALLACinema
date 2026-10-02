import { clock } from '../../format';
import type { Strings } from '../../i18n/strings';

/** The cinema-local date ("2026-10-02") at `now`, using the UTC offset written in a showtime's timestamp. */
function localDay(iso: string, now: number) {
  const m = iso.match(/([+-])(\d\d):(\d\d)$/);
  const offset = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) * 60000 : 0;
  return new Date(now + offset).toISOString().slice(0, 10);
}

/**
 * When a show starts, as the live site writes it: "Today, 7:45 PM" (`sep` 'comma'), "Today · 7:45 PM" (`sep` 'dot'),
 * "Tomorrow, …", else "Fri 2 Oct, 7:45 PM". Days are the cinema's (the timestamp's own offset), not the device's.
 */
export function showWhen(iso: string, t: Strings, sep: 'comma' | 'dot', now = Date.now()) {
  const day = iso.slice(0, 10);
  const [y, mo, d] = day.split('-').map(Number);
  const label = day === localDay(iso, now) ? t.checkoutUi.today
    : day === localDay(iso, now + 86400000) ? t.checkoutUi.tomorrow
      : `${t.weekdays[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]} ${d} ${t.months[mo - 1]}`;
  return `${label}${sep === 'comma' ? t.checkoutUi.comma : ' ·'} ${clock(iso, t)}`;
}
