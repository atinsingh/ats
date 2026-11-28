import { test } from 'node:test';
import assert from 'node:assert/strict';

import { STALL_DAYS, summarizePipeline, type AppLike } from '../src/lib/pipeline/summary.ts';

const now = new Date('2026-11-25T12:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
const app = (status: string, updatedDaysAgo: number, noUpdatedAt = false): AppLike => ({
  status,
  appliedAt: daysAgo(updatedDaysAgo + 1),
  updatedAt: noUpdatedAt ? undefined : daysAgo(updatedDaysAgo),
});

test('counts each stage, folds interview states, and excludes closed outcomes from active', () => {
  const [row] = summarizePipeline(
    [{ id: 'j1', title: 'Java Dev' }],
    {
      j1: [
        app('APPLIED', 1),
        app('APPLIED', 1),
        app('SCREENING', 1),
        app('INTERVIEW_SCHEDULED', 1),
        app('INTERVIEWED', 1),
        app('HIRED', 1),
        app('REJECTED', 1),
        app('WITHDRAWN', 1),
      ],
    },
    now,
  ).rows;
  assert.deepEqual(row!.counts, {
    APPLIED: 2,
    SCREENING: 1,
    SHORTLISTED: 0,
    INTERVIEW: 2,
    OFFERED: 0,
    HIRED: 1,
  });
  assert.equal(row!.active, 6); // hired still counts as active; only closed outcomes drop out
  assert.equal(row!.closed, 2);
});

test(`stalled means an active application untouched for ${STALL_DAYS}+ days`, () => {
  const { rows } = summarizePipeline(
    [{ id: 'j1', title: 'A' }],
    {
      j1: [
        app('APPLIED', STALL_DAYS),
        app('SCREENING', STALL_DAYS - 1),
        app('HIRED', 30),
        app('OFFERED', 9, true),
      ],
    },
    now,
  );
  // APPLIED at 5 days: stalled. SCREENING at 4: fresh. HIRED: terminal. OFFERED with no updatedAt
  // falls back to appliedAt (10 days ago): stalled.
  assert.equal(rows[0]!.stalled, 2);
});

test('rows sort by stalled, then active; totals add up; failed jobs are kept with their error', () => {
  const s = summarizePipeline(
    [
      { id: 'a', title: 'Quiet' },
      { id: 'b', title: 'Busy' },
      { id: 'c', title: 'Stuck' },
      { id: 'd', title: 'Broken' },
    ],
    {
      a: [],
      b: [app('APPLIED', 1), app('APPLIED', 1), app('SCREENING', 1)],
      c: [app('APPLIED', 8)],
      d: new Error('503 from application-service'),
    },
    now,
  );
  assert.deepEqual(
    s.rows.map((r) => r.jobId),
    ['c', 'b', 'a', 'd'],
  );
  assert.equal(s.rows[3]!.error, '503 from application-service');
  assert.equal(s.totals.active, 4);
  assert.equal(s.totals.stalled, 1);
  assert.equal(s.totals.counts.APPLIED, 3);
});
