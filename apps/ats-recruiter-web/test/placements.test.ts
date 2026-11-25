import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  daysBetween,
  formatDate,
  formatPercent,
  margin,
  placementFlags,
  placementStatus,
  placementTotals,
  sortPlacements,
  type Placement,
} from '../src/lib/placements/placements.ts';
import { representativePlacements } from '../src/lib/placements/representative.ts';

const today = '2026-11-25';
const base: Placement = {
  id: 'p',
  contractor: 'A',
  client: 'C',
  role: 'R',
  start: '2026-01-05',
  end: '2027-06-30',
  bill: 100,
  pay: 80,
  extension: 'none',
};

test('daysBetween and margin', () => {
  assert.equal(daysBetween('2026-11-25', '2026-12-16'), 21);
  assert.equal(daysBetween('2026-11-25', '2026-11-13'), -12);
  assert.equal(daysBetween('2026-02-28', '2026-03-01'), 1);
  assert.equal(margin({ bill: 82, pay: 64 }).toFixed(4), '0.2195');
  assert.equal(margin({ bill: 0, pay: 0 }), 0);
  assert.equal(formatPercent(0.21951), '22.0%');
  assert.equal(formatDate('2026-12-15'), 'Dec 15, 2026');
});

test('status from dates; the end day itself still counts', () => {
  assert.equal(placementStatus({ ...base, start: '2026-11-26' }, today), 'starting');
  assert.equal(placementStatus(base, today), 'active');
  assert.equal(placementStatus({ ...base, end: '2026-12-25' }, today), 'ending'); // 30 days
  assert.equal(placementStatus({ ...base, end: '2026-12-26' }, today), 'active'); // 31 days
  assert.equal(placementStatus({ ...base, end: today }, today), 'ending');
  assert.equal(placementStatus({ ...base, end: '2026-11-24' }, today), 'ended');
});

test('flags: redeployment, extension asked, margin floor', () => {
  const ending = { ...base, end: '2026-12-16' };
  assert.deepEqual(placementFlags(ending, today), [
    { tone: 'warning', label: 'Plan redeployment, ends in 21 days' },
  ]);
  assert.deepEqual(placementFlags({ ...ending, extension: 'agreed' }, today), []);
  assert.deepEqual(placementFlags({ ...ending, extension: 'asked' }, today), [
    { tone: 'warning', label: 'Extension asked, ends in 21 days' },
  ]);
  assert.deepEqual(placementFlags({ ...base, extension: 'asked' }, today), [
    { tone: 'info', label: 'Extension asked' },
  ]);
  assert.deepEqual(placementFlags({ ...base, pay: 84 }, today), [
    { tone: 'danger', label: 'Margin below 18%' },
  ]);
});

test('sort and totals on the representative data', () => {
  const rows = representativePlacements(today);
  assert.deepEqual(
    sortPlacements(rows, today).map((p) => p.id),
    ['lena', 'sam', 'wei', 'ravi', 'mei', 'jordan'], // flagged first; Kofi has ended
  );
  const t = placementTotals(rows, today);
  assert.equal(t.onAssignment, 5);
  assert.equal(t.starting, 1);
  assert.equal(t.endingSoon, 1);
  // (18 + 16 + 14 + 21 + 17) / (82 + 74 + 90 + 96 + 78)
  assert.equal(t.averageMargin!.toFixed(4), (86 / 420).toFixed(4));
  assert.equal(placementTotals([], today).averageMargin, null);
});
