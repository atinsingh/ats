import assert from 'node:assert/strict';
import { test } from 'node:test';

import { toReport } from '../src/lib/reports/live.ts';
import { agentRows, sourceRows } from '../src/lib/reports/reports.ts';

const report = {
  days: 90,
  since: '2026-08-30T00:00:00Z',
  funnel: [
    { stage: 'Applied or sourced', count: 10 },
    { stage: 'Started', count: 2 },
  ],
  sources: [
    { source: 'REFERRAL', applications: 3, submitted: 2, started: 1 },
    { source: 'NEW_SOURCE', applications: 1, submitted: 0, started: 0 },
  ],
  agents: [{ kind: 'REJECTION_EMAIL', proposals: 5, approved: 3, rejected: 1 }],
};

test('labels sources and agents, and leaves untracked money and time empty', () => {
  const r = toReport(report);
  assert.deepEqual(r.funnel[1], { stage: 'Started', count: 2 });
  assert.equal(r.sources[0]!.source, 'Referral');
  assert.equal(r.sources[1]!.source, 'New source');
  const [s] = sourceRows(r.sources);
  assert.equal(s!.spend, null);
  assert.equal(s!.costPerStart, null);
  assert.equal(s!.startRate, 0.5);
  const [a] = agentRows(r.agents);
  assert.equal(a!.agent, 'Rejection emails');
  assert.equal(a!.decided, 4);
  assert.equal(a!.approvedShare, 0.75);
  assert.equal(a!.editedShare, null);
  assert.equal(a!.hoursSaved, null);
});
