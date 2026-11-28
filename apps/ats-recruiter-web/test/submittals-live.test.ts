import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { SubmittalRecord } from '@jobocate/api-sdk';

import { idsToLookUp, toSubmittalRows } from '../src/lib/submittals/live.ts';
import { followUpDue, formatBillRate } from '../src/lib/submittals/submittals.ts';

const ME = '33333333-3333-3333-3333-333333333301';

const rec = (over: Partial<SubmittalRecord>): SubmittalRecord => ({
  id: 's1',
  applicationId: 'a1',
  jobId: 'j1',
  candidateProfileId: 'p1',
  clientId: 'c1',
  channel: 'Beeline',
  status: 'CLIENT_REVIEWING',
  billRate: 92.5,
  ownerUserId: ME,
  approvedByUserId: ME,
  submittedAt: '2026-11-20T15:00:00Z',
  lastClientActivityAt: null,
  latestNote: 'Submitted',
  createdAt: '2026-11-19T15:00:00Z',
  ...over,
});

const names = {
  candidates: new Map([['p1', 'Sample Candidate']]),
  jobs: new Map([['j1', 'Senior Java Developer']]),
  clients: new Map([['c1', 'Harbourline Freight']]),
};

test('maps names, status, rate and owner', () => {
  const [s] = toSubmittalRows([rec({})], names, ME);
  assert.equal(s.candidate, 'Sample Candidate');
  assert.equal(s.job, 'Senior Java Developer');
  assert.equal(s.client, 'Harbourline Freight');
  assert.equal(s.status, 'client-reviewing');
  assert.equal(s.billRate, 92.5);
  assert.equal(s.owner, 'You');
  assert.equal(s.latest, 'Submitted');
});

test('missing lookups and fields read plainly', () => {
  const [s] = toSubmittalRows(
    [
      rec({
        candidateProfileId: 'gone',
        jobId: 'gone',
        clientId: null,
        status: 'AWAITING_APPROVAL',
        billRate: null,
        submittedAt: null,
        latestNote: null,
        ownerUserId: 'other',
      }),
    ],
    names,
    ME,
  );
  assert.equal(s.candidate, 'Candidate not found');
  assert.equal(s.job, 'Job not found');
  assert.equal(s.client, 'No client set');
  assert.equal(s.status, 'awaiting-approval');
  assert.equal(s.billRate, undefined);
  assert.equal(s.submittedAt, undefined);
  assert.equal(s.latest, 'Waiting for your approval');
  assert.equal(s.owner, 'Teammate');
  assert.equal(formatBillRate(s.billRate), 'Not set');
});

test('follow-up rule runs on the real submitted date', () => {
  const [s] = toSubmittalRows([rec({})], names, ME);
  // Submitted Fri Nov 20; by Thu Nov 26 that is 4 business days of silence.
  assert.equal(followUpDue(s, new Date('2026-11-26T12:00:00Z')), true);
  assert.equal(followUpDue(s, new Date('2026-11-24T12:00:00Z')), false);
});

test('lookups are unique, skip blanks and are capped', () => {
  assert.deepEqual(idsToLookUp(['a', 'b', 'a', null, undefined, 'c'], 2), ['a', 'b']);
  assert.equal(formatBillRate(95), '$95/hr');
  assert.equal(formatBillRate(92.5), '$92.50/hr');
});
