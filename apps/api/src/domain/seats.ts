import type { Arrangement, SeatGroup, SeatId, SeatMap } from './types.ts';

export const seatId = (row: number, col: number): SeatId => String.fromCharCode(65 + row) + (col + 1);

/** Free seats in each row, split into runs of seats immediately next to each other. */
function freeBlocks(map: SeatMap, blocked: Set<SeatId>): SeatId[][] {
  const blocks: SeatId[][] = [];
  for (let r = 0; r < map.rows; r++) {
    let run: SeatId[] = [];
    for (let c = 0; c < map.cols; c++) {
      const id = seatId(r, c);
      if (blocked.has(id)) {
        if (run.length) blocks.push(run);
        run = [];
      } else run.push(id);
    }
    if (run.length) blocks.push(run);
  }
  return blocks;
}

/**
 * Every seat group that satisfies the request exactly (BRD 7.1).
 * Connected: `count` seats side by side in one row.
 * Separated: `count` seats drawn from two or more blocks; only offered when the customer allows it.
 */
export function findSeatGroups(
  map: SeatMap,
  count: number,
  arrangement: Arrangement,
  extraBlocked: Iterable<SeatId> = [],
): SeatGroup[] {
  const blocked = new Set<SeatId>([...map.unavailable, ...extraBlocked]);
  const blocks = freeBlocks(map, blocked);
  const groups: SeatGroup[] = [];

  if (arrangement !== 'separated') {
    for (const block of blocks)
      for (let i = 0; i + count <= block.length; i++)
        groups.push({ type: 'connected', pattern: [count], seats: block.slice(i, i + count) });
  }

  if (arrangement !== 'connected' && count > 1) {
    // Greedy: take the largest blocks first (capped below `count` so the result is genuinely separated).
    const sorted = [...blocks].sort((a, b) => b.length - a.length);
    const seats: SeatId[] = [];
    const pattern: number[] = [];
    for (const block of sorted) {
      const need = count - seats.length;
      if (!need) break;
      const take = Math.min(block.length, need, count - 1);
      seats.push(...block.slice(0, take));
      pattern.push(take);
    }
    if (seats.length === count) groups.push({ type: 'separated', pattern, seats });
  }

  return groups;
}

/** The group highlighted on the seat map; customers may pick any other qualifying group. */
export function bestGroup(groups: SeatGroup[], map: SeatMap): SeatGroup | undefined {
  // Prefer seats near the middle of the auditorium, a few rows back from the screen.
  const idealRow = Math.floor(map.rows * 0.6);
  const idealCol = (map.cols - 1) / 2;
  const score = (g: SeatGroup) =>
    g.seats.reduce((sum, s) => {
      const row = s.charCodeAt(0) - 65;
      const col = Number(s.slice(1)) - 1;
      return sum + Math.abs(row - idealRow) * 2 + Math.abs(col - idealCol);
    }, 0) / g.seats.length;
  return [...groups].sort((a, b) => score(a) - score(b))[0];
}
