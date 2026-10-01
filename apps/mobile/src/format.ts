const pad = (n: number) => String(n).padStart(2, '0');

/** "Thu 1 Oct · 19:45" from a showtime's ISO timestamp, keeping the cinema's local time. */
export function showDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getUTCDay()];
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
  return `${wd} ${d} ${mon} · ${iso.slice(11, 16)}`;
}

export const egp = (n: number) => `${n} EGP`;
export const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${pad(Math.floor((ms % 60000) / 1000))}`;
