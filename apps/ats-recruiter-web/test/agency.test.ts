import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  deskTotals,
  dueLabel,
  queueState,
  sortDesks,
  sortManagerItems,
} from '../src/lib/agency/agency.ts';
import {
  representativeDesks,
  representativeManagerItems,
} from '../src/lib/agency/representative.ts';

const desks = representativeDesks();

test('queueState flags over 10 as a warning and over 20 as behind, in words', () => {
  assert.deepEqual(queueState(10), { tone: 'success', text: '10 waiting' });
  assert.deepEqual(queueState(11), { tone: 'warning', text: '11 waiting' });
  assert.deepEqual(queueState(20), { tone: 'warning', text: '20 waiting' });
  assert.deepEqual(queueState(26), { tone: 'danger', text: '26 waiting, behind' });
});

test('deskTotals sums every column and counts desks behind', () => {
  assert.deepEqual(deskTotals(desks), {
    roles: 163,
    submittals: 59,
    interviews: 23,
    starts: 8,
    queue: 51,
    newClients: 4,
    behind: 1,
  });
  assert.equal(deskTotals([]).roles, 0);
});

test('sortDesks sorts by a column either way, name breaking ties', () => {
  assert.deepEqual(
    sortDesks(desks, 'queue', 'desc').map((d) => d.name),
    ['Dev P.', 'Ben C.', 'Erin L.', 'Aisha K.', 'Carmen D.'],
  );
  assert.deepEqual(
    sortDesks(desks, 'starts', 'asc').map((d) => d.name),
    ['Dev P.', 'Ben C.', 'Carmen D.', 'Aisha K.', 'Erin L.'],
  );
  assert.equal(desks[0]!.name, 'Aisha K.', 'input is not mutated');
});

test('sortManagerItems puts blocking items first, then nearest due date', () => {
  const day = (n: number) => new Date(Date.UTC(2026, 10, 27 + n)).toISOString().slice(0, 10);
  const items = [...representativeManagerItems(day)].reverse();
  assert.deepEqual(
    sortManagerItems(items).map((i) => i.id),
    ['m-duplicate', 'm-territory', 'm-credential', 'm-compliance'],
  );
});

test('dueLabel counts whole days', () => {
  assert.equal(dueLabel('2026-12-02', '2026-11-27'), 'Due in 5 days');
  assert.equal(dueLabel('2026-11-28', '2026-11-27'), 'Due tomorrow');
  assert.equal(dueLabel('2026-11-27', '2026-11-27'), 'Due today');
  assert.equal(dueLabel('2026-11-26', '2026-11-27'), 'Overdue by 1 day');
});
