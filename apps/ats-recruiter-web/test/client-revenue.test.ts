import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ClientRecord } from '@jobocate/api-sdk';

import { toClientRows } from '../src/lib/clients/live.ts';
import {
  placementRevenue12m,
  revenueByClient,
  weekdaysBetween,
} from '../src/lib/clients/revenue.ts';

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const p = (clientId: string | null, startDate: string, endDate: string, billRate = 100) => ({
  clientId,
  startDate,
  endDate,
  billRate,
});

test('counts weekdays only, both ends included', () => {
  // Mon 2026-11-23 to Sun 2026-11-29: five weekdays.
  assert.equal(weekdaysBetween(day('2026-11-23'), day('2026-11-29')), 5);
  // Sat to Sun: none.
  assert.equal(weekdaysBetween(day('2026-11-28'), day('2026-11-29')), 0);
  // A single Monday.
  assert.equal(weekdaysBetween(day('2026-11-23'), day('2026-11-23')), 1);
  // End before start.
  assert.equal(weekdaysBetween(day('2026-11-24'), day('2026-11-23')), 0);
});

test('stops at today and ignores future starts', () => {
  // Started Mon 2026-11-23, ends next year; today is Fri 2026-11-27: 5 days × 8h × $100.
  assert.equal(placementRevenue12m(p('c1', '2026-11-23', '2027-06-30'), '2026-11-27'), 4000);
  assert.equal(placementRevenue12m(p('c1', '2026-12-01', '2027-06-30'), '2026-11-27'), 0);
});

test('clips to the last 12 months', () => {
  // Ran for years before: only the 365-day window counts, about 261 weekdays.
  const r = placementRevenue12m(p('c1', '2020-01-01', '2026-11-27'), '2026-11-27');
  assert.ok(r >= 260 * 800 && r <= 262 * 800, String(r));
});

test('sums per client and leaves out placements without a client', () => {
  const m = revenueByClient(
    [
      p('c1', '2026-11-23', '2026-11-27'),
      p('c1', '2026-11-23', '2026-11-27', 50),
      p(null, '2026-11-23', '2026-11-27'),
    ],
    '2026-11-27',
  );
  assert.equal(m.get('c1'), 4000 + 2000);
  assert.equal(m.size, 1);
});

test('client rows read $0 without placements, and stay untracked without the map', () => {
  const rec = { id: 'c2', name: 'Maple Ridge Health', status: 'ACTIVE', openJobs: 1 } as ClientRecord;
  assert.equal(toClientRows([rec], 'u1', new Map())[0].revenue12m, 0);
  assert.equal(toClientRows([rec], 'u1', new Map([['c2', 1234.4]]))[0].revenue12m, 1234);
  assert.equal(toClientRows([rec], 'u1')[0].revenue12m, undefined);
});
