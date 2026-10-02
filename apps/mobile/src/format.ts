import type { Strings } from './i18n/strings';

const pad = (n: number) => String(n).padStart(2, '0');

/** "Thu 1 Oct · 19:45" from a showtime's ISO timestamp, keeping the cinema's local time. */
export function showDate(iso: string, t: Strings) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const weekday = t.weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${t.months[m - 1]} · ${iso.slice(11, 16)}`;
}

export const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${pad(Math.floor((ms % 60000) / 1000))}`;

/**
 * "7:45 PM" in English, "7:45 م" in Arabic, as the live site writes show times. Takes "19:45" or a showtime's ISO
 * timestamp (its cinema-local time is kept, as in showDate).
 */
export function clock(time: string, t: Strings) {
  const [h, m] = (time.length > 5 ? time.slice(11, 16) : time).split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? t.shell.am : t.shell.pm}`;
}
