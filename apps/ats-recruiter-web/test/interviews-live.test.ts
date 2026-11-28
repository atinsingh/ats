import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { InterviewRecord } from '@jobocate/api-sdk';

import { jobIdsToLookUp, mediumOf, toAgendaRows } from '../src/lib/interviews/live.ts';
import { weekAgenda } from '../src/lib/interviews/interviews.ts';

const row = (over: Partial<InterviewRecord>): InterviewRecord => ({
  id: 'i1',
  applicationId: 'a1',
  jobId: 'j1',
  type: 'VIDEO',
  status: 'SCHEDULED',
  scheduledStart: '2026-11-30T15:00:00Z',
  scheduledEnd: '2026-11-30T15:45:00Z',
  meetingUrl: 'https://meet.example.test/x',
  ...over,
});

test('real interviews become agenda rows with the job title', () => {
  const rows = toAgendaRows(
    [row({}), row({ id: 'i2', type: 'PHONE', status: 'RESCHEDULED', jobId: 'gone' })],
    new Map([['j1', 'Senior Java Developer']]),
  );
  assert.deepEqual(
    rows.map((r) => [r.id, r.title, r.detail, r.medium, r.status]),
    [
      ['i1', 'Video interview', 'Senior Java Developer', 'video call', 'scheduled'],
      ['i2', 'Phone screen', 'Job not found', 'phone', 'rescheduled'],
    ],
  );
});

test('cancelled, completed and no-show interviews stay off the agenda', () => {
  const rows = toAgendaRows(
    [row({ status: 'CANCELLED' }), row({ status: 'COMPLETED' }), row({ status: 'NO_SHOW' })],
    new Map(),
  );
  assert.equal(rows.length, 0);
});

test('mediumOf prefers the meeting link, then the place', () => {
  assert.equal(mediumOf({ type: 'ONSITE', location: 'Bay St office', meetingUrl: null }), 'Bay St office');
  assert.equal(mediumOf({ type: 'ONSITE', location: null, meetingUrl: null }), 'on site');
  assert.equal(mediumOf({ type: 'PANEL', location: null, meetingUrl: null }), 'place not set');
});

test('job lookups are unique and capped', () => {
  const rows = Array.from({ length: 40 }, (_, n) => row({ id: `i${n}`, jobId: `j${n % 30}` }));
  const ids = jobIdsToLookUp(rows);
  assert.equal(ids.length, 25);
  assert.equal(new Set(ids).size, 25);
});

test('mapped rows flow through the week agenda with firm-local labels', () => {
  const now = new Date('2026-11-30T13:00:00Z');
  const agenda = weekAgenda(toAgendaRows([row({})], new Map()), now, 'America/Toronto');
  assert.equal(agenda.length, 1);
  assert.equal(agenda[0]!.dayLabel, 'Today');
  assert.equal(agenda[0]!.timeLabel, '10:00 AM');
});
