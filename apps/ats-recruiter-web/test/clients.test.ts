import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  attention,
  clientTotals,
  daysSince,
  filterClients,
  formatLastContact,
  formatMoney,
  sortClients,
  type Client,
} from '../src/lib/clients/clients.ts';
import { representativeClients } from '../src/lib/clients/representative.ts';

const now = new Date('2026-11-25T17:00:00Z');
const base: Client = {
  id: 'a',
  name: 'Ångström Labs',
  status: 'active',
  openJobs: 1,
  revenue12m: 100_000,
  channel: 'Direct',
  owner: 'You',
  lastContactAt: '2026-11-24T17:00:00Z',
};

test('daysSince and formatLastContact', () => {
  assert.equal(daysSince(undefined, now), null);
  assert.equal(daysSince('2026-11-24T17:00:00Z', now), 1);
  assert.equal(formatLastContact('2026-11-25T09:00:00Z', now), 'Today');
  assert.equal(formatLastContact('2026-11-24T17:00:00Z', now), 'Yesterday');
  assert.equal(formatLastContact('2026-11-15T17:00:00Z', now), '10 days ago');
  assert.equal(formatLastContact(undefined, now), 'Never');
});

test('attention: MSA within 60 days wins, then quiet active clients', () => {
  assert.equal(attention(base, now), null);
  assert.equal(
    attention({ ...base, lastContactAt: '2026-11-11T17:00:00Z' }, now),
    'No contact in 14 days',
  );
  assert.equal(attention({ ...base, lastContactAt: '2026-11-12T17:00:00Z' }, now), null);
  assert.equal(attention({ ...base, lastContactAt: undefined }, now), 'No contact on record');
  // Only active clients go quiet; a dormant one is already known to be quiet.
  assert.equal(
    attention({ ...base, status: 'dormant', lastContactAt: '2025-01-01T00:00:00Z' }, now),
    null,
  );
  assert.equal(
    attention({ ...base, msaEndsAt: '2026-12-25T17:00:00Z' }, now),
    'MSA ends in 30 days',
  );
  assert.equal(attention({ ...base, msaEndsAt: '2026-11-26T17:00:00Z' }, now), 'MSA ends in 1 day');
  assert.equal(attention({ ...base, msaEndsAt: '2027-03-01T00:00:00Z' }, now), null);
  assert.equal(attention({ ...base, msaEndsAt: '2026-11-01T00:00:00Z' }, now), 'MSA has ended');
});

test('filterClients: words, status, owner and channel', () => {
  const rows: Client[] = [
    base,
    {
      ...base,
      id: 'b',
      name: 'Fabrikam',
      owner: 'Ben C.',
      channel: 'SAP Fieldglass',
      status: 'prospect',
    },
  ];
  assert.deepEqual(
    filterClients(rows, { query: 'angstrom' }).map((c) => c.id),
    ['a'],
  );
  assert.deepEqual(
    filterClients(rows, { query: 'ben' }).map((c) => c.id),
    ['b'],
  );
  assert.deepEqual(
    filterClients(rows, { owner: 'me' }).map((c) => c.id),
    ['a'],
  );
  assert.deepEqual(
    filterClients(rows, { status: 'prospect' }).map((c) => c.id),
    ['b'],
  );
  assert.deepEqual(
    filterClients(rows, { channel: 'Direct', status: 'all' }).map((c) => c.id),
    ['a'],
  );
});

test('sortClients: flagged first, then revenue, then name', () => {
  const rows: Client[] = [
    { ...base, id: 'big', revenue12m: 900_000 },
    { ...base, id: 'quiet', revenue12m: 10, lastContactAt: '2026-10-01T00:00:00Z' },
    { ...base, id: 'b-name', name: 'B', revenue12m: 0, status: 'prospect' },
    { ...base, id: 'a-name', name: 'A', revenue12m: 0, status: 'prospect' },
  ];
  assert.deepEqual(
    sortClients(rows, now).map((c) => c.id),
    ['quiet', 'big', 'a-name', 'b-name'],
  );
});

test('formatMoney and totals on the representative data', () => {
  assert.equal(formatMoney(0), '$0');
  assert.equal(formatMoney(880_000), '$880K');
  assert.equal(formatMoney(1_420_000), '$1.42M');
  assert.equal(formatMoney(2_000_000), '$2M');
  assert.equal(formatMoney(5_350_000), '$5.35M');
  const t = clientTotals(representativeClients(now), now);
  assert.deepEqual(t, {
    clients: 7,
    active: 5,
    openJobs: 16,
    revenue12m: 5_350_000,
    needsAttention: 2, // Adatum quiet 19 days, Litware MSA in 24 days
  });
});
