// Free choice of seats on the seat map (BRD 7.1, 7.2). Pure logic, kept apart from the screen so it is easy to follow.

/**
 * The seats the customer will hold, and where they came from: our best-group suggestion, a matching
 * group they tapped, or seats they picked one by one.
 */
export type Selection = { seats: string[]; source: 'suggested' | 'group' | 'own' };

/**
 * Tapping a seat. A picked seat is dropped; a free seat is added while there is room. When the
 * selection is already full, a tap on a free seat starts the customer's own selection from that seat
 * if they were looking at a suggestion or a group (or only need one seat, so it simply moves).
 * Otherwise nothing changes and `full` tells the screen to explain why.
 */
export function tapSeat(sel: Selection, id: string, count: number): { selection: Selection; full: boolean } {
  if (sel.seats.includes(id)) return { selection: { seats: sel.seats.filter((s) => s !== id), source: 'own' }, full: false };
  if (sel.seats.length < count) return { selection: { seats: [...sel.seats, id], source: 'own' }, full: false };
  if (sel.source !== 'own' || count === 1) return { selection: { seats: [id], source: 'own' }, full: false };
  return { selection: sel, full: true };
}

const row = (seat: string) => seat[0];
const num = (seat: string) => Number(seat.slice(1));

/**
 * Block sizes of a selection, largest first: seats side by side in one row count as one block,
 * unless an aisle runs between them. [1] or [3] means together; [2, 1] means split 2+1.
 */
export function seatPattern(seats: string[], aisles: number[] = []): number[] {
  const sorted = [...seats].sort((a, b) => row(a).localeCompare(row(b)) || num(a) - num(b));
  const blocks: number[] = [];
  sorted.forEach((seat, i) => {
    const prev = sorted[i - 1];
    const joined = prev && row(prev) === row(seat) && num(prev) === num(seat) - 1 && !aisles.includes(num(prev));
    if (joined) blocks[blocks.length - 1]++;
    else blocks.push(1);
  });
  return blocks.sort((a, b) => b - a);
}
