import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { SubmittalRecord } from '@jobocate/api-sdk';

import { DECLINE_REASON, submittalToProposal } from '../src/lib/review/artifacts.ts';
import { canEdit, decide, emptyQueue, isBlocked } from '../src/lib/review/queue.ts';

const NOW = new Date('2026-11-28T15:00:00Z');

const rec = (over: Partial<SubmittalRecord> = {}): SubmittalRecord => ({
  id: 's1',
  applicationId: 'a1',
  jobId: 'j1',
  candidateProfileId: 'p1',
  clientId: 'c1',
  channel: 'Beeline',
  status: 'AWAITING_APPROVAL',
  billRate: 92.5,
  ownerUserId: 'u1',
  createdAt: '2026-11-28T12:00:00Z',
  ...over,
});

const names = {
  candidates: new Map([['p1', 'Sample Candidate']]),
  jobs: new Map([['j1', 'Senior Java Developer']]),
  clients: new Map([['c1', 'Harbourline Freight']]),
};

test('a submittal becomes an approve-or-decline proposal that sends nothing', () => {
  const p = submittalToProposal(rec(), names, NOW);
  assert.equal(p.kind, 'submittal');
  assert.equal(p.title, 'Submit Sample Candidate to Harbourline Freight');
  assert.equal(p.summary, 'For Senior Java Developer at $92.50/hr through Beeline.');
  assert.equal(p.approveLabel, 'Approve submittal');
  assert.match(p.destination, /^nowhere from here/);
  assert.equal(p.dueLabel, 'Waiting 3 hours');
  assert.deepEqual(p.checks, []);
  assert.equal(canEdit(p), false);
  assert.throws(() => decide(emptyQueue(), p, { outcome: 'edited', draft: 'x' }));
  assert.equal(decide(emptyQueue(), p, { outcome: 'approved' }).decisions.s1?.outcome, 'approved');
});

test('a missing client or rate is a warning, not a block', () => {
  const p = submittalToProposal(rec({ clientId: null, billRate: null }), names, NOW);
  assert.deepEqual(
    p.checks.map((c) => [c.status, c.title]),
    [
      ['warn', 'No client set'],
      ['warn', 'No bill rate'],
    ],
  );
  assert.equal(isBlocked(p), false);
  assert.equal(p.title, 'Submit Sample Candidate to a client');
  assert.equal(p.summary, 'For Senior Java Developer through Beeline.');
});

test('names that were not found read plainly', () => {
  const p = submittalToProposal(
    rec({ candidateProfileId: 'x', jobId: 'x', clientId: 'x', billRate: 95 }),
    names,
    NOW,
  );
  assert.equal(p.title, 'Submit a candidate to a client not found');
  assert.equal(p.summary, 'For a job that was not found at $95/hr through Beeline.');
  assert.equal(DECLINE_REASON, 'Declined in the Review queue');
});
