import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  attentionList,
  clock,
  decisionSummary,
  decisionsHeadline,
  greeting,
  interviewsToday,
  longDate,
  type Attention,
} from '../src/lib/home/home.ts';
import type { Interview } from '../src/lib/interviews/interviews.ts';
import type { Proposal } from '../src/lib/review/queue.ts';
import { representativeProposals } from '../src/lib/review/representative.ts';

const TZ = 'America/Toronto';
const now = new Date('2026-11-26T15:00:00Z'); // 10:00 AM Thursday in Toronto

test('greeting and date follow the firm time zone, not UTC', () => {
  assert.equal(greeting(now, TZ), 'Good morning');
  assert.equal(greeting(new Date('2026-11-26T19:00:00Z'), TZ), 'Good afternoon');
  // 11 PM UTC is 6 PM in Toronto.
  assert.equal(greeting(new Date('2026-11-26T23:00:00Z'), TZ), 'Good evening');
  // 3 AM UTC on the 27th is still the 26th in Toronto.
  assert.equal(longDate(new Date('2026-11-27T03:00:00Z'), TZ), 'Thursday, November 26');
  assert.equal(clock('2026-11-26T18:30:00Z', TZ), '1:30 PM');
});

test('headline counts decisions in words', () => {
  assert.equal(decisionsHeadline(0), 'Nothing waits for you.');
  assert.equal(decisionsHeadline(1), 'One decision waits.');
  assert.equal(decisionsHeadline(12), 'Twelve decisions wait.');
  assert.equal(decisionsHeadline(31), '31 decisions wait.');
});

test('decision summary counts urgent and blocked and picks the soonest', () => {
  const base = representativeProposals(now)[0]!;
  const p = (id: string, hours: number, fail = false): Proposal => ({
    ...base,
    id,
    dueAt: new Date(now.getTime() + hours * 3_600_000).toISOString(),
    checks: fail ? [{ status: 'fail', title: 'Duplicate' }] : [{ status: 'pass', title: 'OK' }],
  });
  const s = decisionSummary([p('later', 8), p('soon', 2), p('late', -1, true), p('edge', 3)], now);
  assert.equal(s.total, 4);
  assert.equal(s.urgent, 3);
  assert.equal(s.blocked, 1);
  assert.equal(s.next?.id, 'late');
  assert.deepEqual(decisionSummary([], now), { total: 0, urgent: 0, blocked: 0, next: null });
});

test('interviews today are firm-local and the next is the first still to start', () => {
  const i = (id: string, startsAt: string): Interview => ({
    id,
    title: id,
    detail: '',
    startsAt,
    medium: 'Video',
    status: 'confirmed',
  });
  const { list, next } = interviewsToday(
    [
      i('afternoon', '2026-11-26T18:30:00Z'),
      i('earlier', '2026-11-26T14:00:00Z'),
      // 8 PM Toronto today, though already the 27th in UTC.
      i('evening', '2026-11-27T01:00:00Z'),
      i('tomorrow', '2026-11-27T15:00:00Z'),
    ],
    now,
    TZ,
  );
  assert.deepEqual(
    list.map((x) => x.id),
    ['earlier', 'afternoon', 'evening'],
  );
  assert.equal(next?.id, 'afternoon');
});

test('attention list puts danger first, then by time, and drops duplicates', () => {
  const a = (id: string, tone: Attention['tone'], at?: string): Attention => ({
    id,
    tone,
    title: id,
    detail: '',
    href: '/',
    at,
  });
  const out = attentionList(
    [a('w-late', 'warning', '2026-11-26T20:00:00Z'), a('i', 'info')],
    [a('d', 'danger'), a('w-early', 'warning', '2026-11-26T16:00:00Z'), a('w-none', 'warning')],
    [a('d', 'danger')],
  );
  assert.deepEqual(
    out.map((x) => x.id),
    ['d', 'w-early', 'w-late', 'w-none', 'i'],
  );
});
