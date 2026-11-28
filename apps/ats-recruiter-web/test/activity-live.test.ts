import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ActivityRecord } from '@jobocate/api-sdk';

import { toActivityEvents } from '../src/lib/activity/live.ts';

const names = {
  candidates: new Map([['p1', 'Sample Candidate']]),
  jobs: new Map([['j1', 'Data Analyst']]),
  clients: new Map<string, string>(),
};

const rec = (over: Partial<ActivityRecord>): ActivityRecord => ({
  id: 'e1',
  at: '2026-11-28T15:00:00Z',
  actorKind: 'PERSON',
  actorUserId: 'u1',
  code: 'STATUS_CHANGE',
  fromValue: 'APPLIED',
  toValue: 'SHORTLISTED',
  candidateProfileId: 'p1',
  jobId: 'j1',
  ...over,
});

test('words a status change with the person and subject', () => {
  const [e] = toActivityEvents([rec({})], names, 'u1');
  assert.equal(e!.actor, 'You');
  assert.equal(e!.actorKind, 'person');
  assert.equal(e!.type, 'pipeline');
  assert.equal(e!.action, 'Moved from applied to shortlisted');
  assert.equal(e!.subject, 'Sample Candidate for Data Analyst');
});

test('agent drafts, failures, approvals and overrides', () => {
  const rows = toActivityEvents(
    [
      rec({
        id: 'r',
        actorKind: 'AGENT',
        actorUserId: null,
        code: 'DRAFT_READY',
        detail: 'REJECTION_EMAIL',
      }),
      rec({
        id: 'f',
        actorKind: 'AGENT',
        actorUserId: null,
        code: 'DRAFT_FAILED',
        detail: 'COVER_LETTER',
      }),
      rec({ id: 'x', actorUserId: 'u2', code: 'DRAFT_REJECTED', detail: 'REJECTION_EMAIL' }),
      rec({ id: 's', code: 'SUBMITTAL_APPROVED', detail: 'Beeline', jobId: null }),
    ],
    names,
    'u1',
  );
  assert.equal(rows[0]!.actor, 'AI agent');
  assert.equal(rows[0]!.action, 'Drafted a rejection email for review');
  assert.equal(rows[1]!.failed, true);
  assert.equal(rows[2]!.type, 'override');
  assert.equal(rows[2]!.actor, 'Teammate');
  assert.equal(rows[2]!.reason, 'No reason given');
  assert.equal(rows[3]!.action, 'Approved a submittal as sent through Beeline');
  assert.equal(rows[3]!.subject, 'Sample Candidate');
});

test('unknown codes and missing names read plainly', () => {
  const [e] = toActivityEvents(
    [
      rec({
        code: 'SOMETHING_NEW',
        actorKind: 'SYSTEM',
        actorUserId: null,
        candidateProfileId: 'zz',
        jobId: null,
      }),
    ],
    names,
    'u1',
  );
  assert.equal(e!.action, 'Something new');
  assert.equal(e!.actor, 'System');
  assert.equal(e!.subject, 'Candidate not found');
});

test('names a known colleague instead of "Teammate"', () => {
  const [e] = toActivityEvents(
    [rec({ actorUserId: 'u2' })],
    names,
    'u1',
    new Map([['u2', 'Sample Colleague']]),
  );
  assert.equal(e!.actor, 'Sample Colleague');
});
