import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSeatGroups } from '../src/domain/seats.ts';
import { resaleQuote, bookingTotal } from '../src/domain/pricing.ts';

// Row A: A1 A2 _ A4 ;  Row B: B1 _ B3 B4  (cols = 4, "_" unavailable)
const map = { rows: 2, cols: 4, unavailable: ['A3', 'B2'] };

test('connected groups are seats side by side in one row', () => {
  const groups = findSeatGroups(map, 2, 'connected');
  assert.deepEqual(groups.map((g) => g.seats), [['A1', 'A2'], ['B3', 'B4']]);
});

test('no exact match returns nothing rather than a near match', () => {
  assert.deepEqual(findSeatGroups(map, 3, 'connected'), []);
});

test('separated groups are only offered when allowed and total the request', () => {
  const [group] = findSeatGroups(map, 4, 'separated');
  assert.equal(group.type, 'separated');
  assert.deepEqual(group.pattern, [2, 2]);
  assert.equal(group.seats.length, 4);
  assert.equal(findSeatGroups(map, 4, 'connected').length, 0);
});

test('either returns both kinds', () => {
  const types = new Set(findSeatGroups(map, 2, 'either').map((g) => g.type));
  assert.deepEqual([...types].sort(), ['connected', 'separated']);
});

test('held seats are excluded', () => {
  assert.deepEqual(findSeatGroups(map, 2, 'connected', ['A1']).map((g) => g.seats), [['B3', 'B4']]);
});

test('fees follow the BRD', () => {
  assert.deepEqual(bookingTotal(180, 2), { tickets: 360, fees: 10, total: 370 });
  assert.deepEqual(resaleQuote(15, 180), { buyerPays: 20, sellerReceives: 0 });
  assert.deepEqual(resaleQuote(180, 180), { buyerPays: 185, sellerReceives: 160 });
  assert.throws(() => resaleQuote(181, 180));
});
