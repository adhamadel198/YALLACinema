/** "D5–D7, F2" from a list of seat ids. */
export function describeSeats(seats: string[]) {
  const sorted = [...seats].sort((a, b) => a[0].localeCompare(b[0]) || Number(a.slice(1)) - Number(b.slice(1)));
  const runs: { row: string; start: number; end: number }[] = [];
  for (const s of sorted) {
    const row = s[0], col = Number(s.slice(1)), last = runs[runs.length - 1];
    if (last && last.row === row && last.end === col - 1) last.end = col;
    else runs.push({ row, start: col, end: col });
  }
  return runs.map((r) => (r.start === r.end ? `${r.row}${r.start}` : `${r.row}${r.start}–${r.row}${r.end}`)).join(', ');
}
