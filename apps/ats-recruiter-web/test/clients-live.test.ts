import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ClientRecord } from '@jobocate/api-sdk';

import { clientTotals, formatMoney, sortClients } from '../src/lib/clients/clients.ts';
import { ownerLabel, toClientRows } from '../src/lib/clients/live.ts';

const ME = '33333333-3333-3333-3333-333333333301';

const row = (over: Partial<ClientRecord>): ClientRecord => ({
  id: 'c1',
  name: 'Northwind Logistics',
  status: 'ACTIVE',
  channel: 'Direct',
  ownerUserId: ME,
  lastContactAt: '2026-11-20T15:00:00Z',
  msaEndsOn: null,
  openJobs: 2,
  createdAt: '2026-10-01T12:00:00Z',
  ...over,
});

test('owner is You, Teammate or Unassigned', () => {
  assert.equal(ownerLabel(ME, ME), 'You');
  assert.equal(ownerLabel('someone-else', ME), 'Teammate');
  assert.equal(ownerLabel(null, ME), 'Unassigned');
  assert.equal(ownerLabel(undefined, ME), 'Unassigned');
});

test('maps status, dates and open jobs, and leaves revenue unset', () => {
  const [c] = toClientRows([row({ status: 'DORMANT', msaEndsOn: '2027-01-15' })], ME);
  assert.equal(c.status, 'dormant');
  assert.equal(c.openJobs, 2);
  assert.equal(c.msaEndsAt, '2027-01-15');
  assert.equal(c.lastContactAt, '2026-11-20T15:00:00Z');
  assert.equal(c.revenue12m, undefined);
  assert.equal(c.owner, 'You');
});

test('missing dates stay undefined so the attention rules see no date', () => {
  const [c] = toClientRows([row({ lastContactAt: null, msaEndsOn: undefined })], ME);
  assert.equal(c.lastContactAt, undefined);
  assert.equal(c.msaEndsAt, undefined);
});

test('totals say revenue is not tracked when no client has a figure', () => {
  const now = new Date('2026-11-28T12:00:00Z');
  const rows = toClientRows([row({}), row({ id: 'c2', name: 'Acme', openJobs: 1 })], ME);
  const t = clientTotals(rows, now);
  assert.equal(t.revenue12m, null);
  assert.equal(t.openJobs, 3);
  assert.equal(formatMoney(t.revenue12m), 'Not tracked');
  // Without revenue, the order falls back to the name once flags are equal.
  assert.deepEqual(
    sortClients(rows, now).map((c) => c.name),
    ['Acme', 'Northwind Logistics'],
  );
});
