import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PAGE_SIZE,
  approvalNote,
  csvRows,
  filterEvents,
  formatEventTime,
  pageOf,
  type ActivityEvent,
} from '../src/lib/activity/activity.ts';
import { representativeActivity } from '../src/lib/activity/representative.ts';
import { toCsv } from '../src/lib/reports/reports.ts';

const at = (daysAgo: number, time: string) => {
  const d = new Date(Date.UTC(2026, 10, 27 - daysAgo));
  return `${d.toISOString().slice(0, 10)}T${time}:00-05:00`;
};
const events = representativeActivity(at);
const all = { actor: 'all', type: 'all', query: '' } as const;

test('filterEvents sorts newest first and filters by actor kind', () => {
  const rows = filterEvents(events, all);
  assert.equal(rows.length, events.length);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1]!.at >= rows[i]!.at);
  assert.equal(rows[0]!.action, 'Ordered a background check');
  const agents = filterEvents(events, { ...all, actor: 'agent' });
  assert.ok(agents.length > 0);
  assert.ok(agents.every((e) => e.actorKind === 'agent'));
});

test('the approvals filter includes overrides, and search matches every word', () => {
  const approvals = filterEvents(events, { ...all, type: 'approvals' });
  assert.ok(approvals.some((e) => e.type === 'override'));
  assert.ok(approvals.every((e) => e.type === 'approval' || e.type === 'override'));
  const hits = filterEvents(events, { ...all, query: 'priya  $102' });
  assert.deepEqual(
    hits.map((e) => e.id),
    ['ev-6'],
  );
  assert.equal(filterEvents(events, { ...all, query: 'nobody-matches' }).length, 0);
});

test('pageOf pages by 25 and clamps out-of-range pages', () => {
  assert.equal(PAGE_SIZE, 25);
  const rows = Array.from({ length: 34 }, (_, i) => i);
  assert.deepEqual(
    { ...pageOf(rows, 1), rows: undefined },
    { rows: undefined, page: 1, pages: 2, from: 1, to: 25 },
  );
  const last = pageOf(rows, 9);
  assert.equal(last.page, 2);
  assert.deepEqual([last.from, last.to, last.rows.length], [26, 34, 9]);
  assert.deepEqual({ ...pageOf([], 1), rows: [] }, { rows: [], page: 1, pages: 1, from: 0, to: 0 });
});

test('approvalNote says who approved an agent action or that it waits', () => {
  const byId = (id: string) => events.find((e) => e.id === id)!;
  assert.equal(approvalNote(byId('ev-2')), 'Waiting for approval');
  assert.equal(approvalNote(byId('ev-8')), 'Approved by Priya Shah');
  assert.equal(approvalNote(byId('ev-3')), null);
});

test('csvRows export keeps the override reason and quotes commas', () => {
  const override: ActivityEvent = events.find((e) => e.type === 'override')!;
  const csv = toCsv(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], csvRows([override]));
  assert.match(csv, /Client agreed \$102\/hr on the call/);
  assert.match(csv, /"Wei L\. for Senior Java Developer, Northwind"/);
});

test('formatEventTime says Today and Yesterday in the firm zone', () => {
  const now = new Date('2026-11-27T15:00:00Z');
  const tz = 'America/Toronto';
  assert.equal(formatEventTime('2026-11-27T14:52:00Z', now, tz), 'Today 9:52 AM');
  assert.equal(formatEventTime('2026-11-26T21:12:00Z', now, tz), 'Yesterday 4:12 PM');
  assert.equal(formatEventTime('2026-11-24T20:00:00Z', now, tz), 'Tue, Nov 24, 3:00 PM');
});
