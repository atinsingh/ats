import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  OVERRIDE_MIN_CHARS,
  decide,
  emptyQueue,
  filterByKind,
  isBlocked,
  moveSelection,
  pendingCount,
  sortByDeadline,
  undo,
  type Proposal,
} from '../src/lib/review/queue.ts';

const p = (id: string, dueAt: string, extra: Partial<Proposal> = {}): Proposal => ({
  id,
  kind: 'message',
  agent: 'Outreach',
  title: id,
  summary: '',
  destination: 'by email',
  dueAt,
  dueLabel: dueAt,
  approveLabel: 'Approve',
  checks: [],
  evidence: [],
  ...extra,
});

const a = p('a', '2026-11-25T16:00:00Z', { draft: 'Hi' });
const b = p('b', '2026-11-25T14:00:00Z', {
  kind: 'job-post',
  checks: [{ status: 'fail', title: 'Margin below floor', detail: '15% < 18%' }],
});
const c = p('c', '2026-11-25T14:00:00Z', { kind: 'submittal' });
const all = [a, b, c];

test('sortByDeadline orders by due time and keeps input order on ties', () => {
  assert.deepEqual(
    sortByDeadline(all).map((x) => x.id),
    ['b', 'c', 'a'],
  );
});

test('filterByKind keeps everything for "all"', () => {
  assert.deepEqual(
    filterByKind(all, 'all').map((x) => x.id),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(
    filterByKind(all, 'submittal').map((x) => x.id),
    ['c'],
  );
});

test('a failed check blocks approval; warnings do not', () => {
  assert.ok(isBlocked(b));
  assert.ok(!isBlocked(p('w', 'x', { checks: [{ status: 'warn', title: 't' }] })));
});

test('approve, reject and undo', () => {
  let q = emptyQueue();
  q = decide(q, a, { outcome: 'approved' }, '2026-11-25T12:00:00Z');
  q = decide(q, c, { outcome: 'rejected' }, '2026-11-25T12:01:00Z');
  assert.equal(q.decisions.a?.outcome, 'approved');
  assert.equal(pendingCount(all, q), 1);
  q = undo(q);
  assert.equal(q.decisions.c, undefined);
  assert.equal(q.decisions.a?.outcome, 'approved');
  q = undo(q);
  q = undo(q);
  assert.equal(pendingCount(all, q), 3);
});

test('approving a blocked proposal is refused', () => {
  assert.throws(() => decide(emptyQueue(), b, { outcome: 'approved' }), /blocked/);
});

test('an override needs a written reason and is recorded', () => {
  assert.throws(
    () => decide(emptyQueue(), b, { outcome: 'overridden', reason: ' too short ' }),
    new RegExp(`${OVERRIDE_MIN_CHARS} characters`),
  );
  const q = decide(emptyQueue(), b, {
    outcome: 'overridden',
    reason: 'Client agreed to $102/hr on today’s call.',
  });
  assert.equal(q.decisions.b?.reason, 'Client agreed to $102/hr on today’s call.');
  assert.throws(
    () => decide(emptyQueue(), a, { outcome: 'overridden', reason: 'x'.repeat(20) }),
    /not blocked/,
  );
});

test('editing needs a draft and keeps the edited text', () => {
  assert.throws(() => decide(emptyQueue(), c, { outcome: 'edited', draft: 'x' }), /no draft/);
  assert.throws(() => decide(emptyQueue(), a, { outcome: 'edited', draft: '  ' }), /empty/);
  const q = decide(emptyQueue(), a, { outcome: 'edited', draft: 'Hi Marcus' });
  assert.equal(q.decisions.a?.draft, 'Hi Marcus');
});

test('a proposal is decided only once until undone', () => {
  const q = decide(emptyQueue(), a, { outcome: 'approved' });
  assert.throws(() => decide(q, a, { outcome: 'rejected' }), /already decided/);
});

test('moveSelection wraps within the visible list', () => {
  const ids = ['b', 'c', 'a'];
  assert.equal(moveSelection(ids, 'b', 1), 'c');
  assert.equal(moveSelection(ids, 'a', 1), 'b');
  assert.equal(moveSelection(ids, 'b', -1), 'a');
  assert.equal(moveSelection(ids, 'zzz', 1), 'b');
  assert.equal(moveSelection([], 'b', 1), null);
});
