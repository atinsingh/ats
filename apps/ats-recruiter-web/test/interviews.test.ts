import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decide, emptyQueue, isBlocked } from '../src/lib/review/queue.ts';
import {
  businessDays,
  commonFree,
  formatSlot,
  formatTime,
  inviteProposal,
  slotGrid,
  slotKey,
  summarizeScorecard,
  weekAgenda,
  zonedToIso,
  type Attendee,
} from '../src/lib/interviews/interviews.ts';
import {
  FINAL_ROUND,
  representativeAttendees,
  representativeInterviews,
  representativeScorecard,
} from '../src/lib/interviews/representative.ts';

const tz = 'America/Toronto';
// Wed Nov 25, 2026, 9:00 AM in Toronto.
const now = new Date('2026-11-25T14:00:00Z');

test('businessDays uses the firm-local date and skips weekends', () => {
  assert.deepEqual(businessDays(now, tz, 5), [
    '2026-11-25',
    '2026-11-26',
    '2026-11-27',
    '2026-11-30',
    '2026-12-01',
  ]);
  // 11 PM Friday in Toronto is already Saturday in UTC; the firm-local day still counts.
  assert.equal(businessDays(new Date('2026-11-28T04:00:00Z'), tz, 1)[0], '2026-11-27');
});

test('formatting', () => {
  assert.equal(formatTime('09:05'), '9:05 AM');
  assert.equal(formatTime('12:00'), '12:00 PM');
  assert.equal(formatTime('15:30'), '3:30 PM');
  assert.equal(formatSlot({ day: '2026-11-27', time: '11:30' }), 'Fri, Nov 27, 11:30 AM');
});

test('slotGrid names who is busy; commonFree offers only slots everyone can make', () => {
  const days = ['2026-11-25', '2026-11-26'];
  const people: Attendee[] = [
    { name: 'A', source: '', busy: [slotKey({ day: days[1]!, time: '10:00' })] },
    { name: 'B', source: '', busy: [slotKey({ day: days[1]!, time: '10:00' })] },
  ];
  const grid = slotGrid(days, people, now, tz);
  assert.equal(grid.length, 4); // times
  assert.equal(grid[0]!.length, 2); // days
  assert.deepEqual(grid[0]![1]!.busy, ['A', 'B']);
  // 10:00 today is past at 9:00? No: 10:00 is after 9:00, so it is still offered.
  assert.equal(grid[0]![0]!.past, false);
  const later = slotGrid(days, people, new Date('2026-11-25T17:00:00Z'), tz); // noon
  assert.equal(later[0]![0]!.past, true);
  assert.equal(later[1]![0]!.past, true); // 11:30
  assert.equal(later[2]![0]!.past, false); // 14:00
  const free = commonFree(grid).map(slotKey);
  assert.ok(!free.includes('2026-11-26T10:00'));
  assert.equal(free[0], '2026-11-25T10:00');
  assert.equal(free.length, 7);
});

test('the representative panel has a few common slots', () => {
  const days = businessDays(now, tz, 5);
  const free = commonFree(slotGrid(days, representativeAttendees(days), now, tz));
  assert.ok(free.length >= 3);
  assert.ok(free.some((s) => s.day === '2026-11-27' && s.time === '11:30'));
});

test('zonedToIso handles standard and daylight time', () => {
  assert.equal(zonedToIso('2026-11-27', '11:30', tz), '2026-11-27T16:30:00.000Z');
  assert.equal(zonedToIso('2026-07-02', '09:00', tz), '2026-07-02T13:00:00.000Z');
});

test('weekAgenda: next 7 days, soonest first, Today and Tomorrow labels', () => {
  const days = businessDays(now, tz, 5);
  const items = weekAgenda(
    representativeInterviews(days, (d, t) => zonedToIso(d, t, tz), now),
    now,
    tz,
  );
  assert.deepEqual(
    items.map((i) => i.id),
    ['amara-screen', 'hana-fab', 'priya-nw', 'sofia-contoso'],
  );
  assert.equal(items[0]!.dayLabel, 'Today');
  assert.equal(items[0]!.timeLabel, '4:30 PM');
  assert.equal(items[1]!.dayLabel, 'Tomorrow');
  assert.equal(items[2]!.dayLabel, 'Fri, Nov 27');
  assert.equal(items[3]!.dayLabel, 'Mon, Nov 30');
});

test('summarizeScorecard averages and lists areas at or below the bar', () => {
  assert.deepEqual(summarizeScorecard(representativeScorecard(now)), {
    average: 3.7,
    gaps: ['Kafka'],
  });
});

test('proposing a time is an approvable, unblocked decision', () => {
  const p = inviteProposal({ day: '2026-11-27', time: '11:30' }, FINAL_ROUND);
  assert.equal(p.approveLabel, 'Propose Fri, Nov 27, 11:30 AM');
  assert.equal(p.summary, '60 minutes on Teams with Dana W. and Ken J.');
  assert.equal(isBlocked(p), false);
  assert.equal(decide(emptyQueue(), p, { outcome: 'approved' }).history[0], p.id);
});
