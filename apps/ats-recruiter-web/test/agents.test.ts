import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  capOptions,
  capabilityState,
  clampToPolicy,
  formatCost,
  formatRunTime,
  formatSync,
  outOfOfficeError,
  runTotals,
  runsFor,
  sortConnections,
  withoutAsking,
  type Agent,
  type FirmPolicy,
} from '../src/lib/agents/agents.ts';
import {
  representativeAgents,
  representativeConnections,
  representativePolicy,
  representativeRuns,
} from '../src/lib/agents/representative.ts';

const TZ = 'America/Toronto';
const now = new Date('2026-11-25T15:00:00Z'); // 10:00 AM in Toronto
const at = (daysAgo: number, time: string) => {
  const [h, m] = time.split(':').map(Number);
  // Toronto is UTC-5 in late November.
  return new Date(Date.UTC(2026, 10, 25 - daysAgo, h! + 5, m!)).toISOString();
};
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

test('the platform rule keeps declines and advances with a person whatever the policy says', () => {
  const lax: FirmPolicy = { 'decline-applicants': 'allowed', 'advance-candidates': 'allowed' };
  assert.equal(capabilityState('decline-applicants', lax).kind, 'never');
  assert.equal(capabilityState('advance-candidates', lax).kind, 'never');
  assert.equal(capabilityState('shortlist', { shortlist: 'allowed' }).kind, 'open');
  assert.equal(
    capabilityState('first-outreach', { 'first-outreach': 'approval' }).kind,
    'firm-locked',
  );
  // Not mentioned in the policy means approval every time.
  assert.equal(capabilityState('interview-reminders', {}).kind, 'firm-locked');
  assert.deepEqual(
    clampToPolicy(['shortlist', 'decline-applicants', 'first-outreach', 'shortlist'], {
      ...lax,
      shortlist: 'allowed',
    }),
    ['shortlist'],
  );
});

test('withoutAsking reflects the policy and what the recruiter switched on', () => {
  const policy = representativePolicy();
  const by = Object.fromEntries(representativeAgents().map((a) => [a.id, a])) as Record<
    string,
    Agent
  >;
  const enabled = ['shortlist', 'interview-reminders', 'decline-applicants'] as const;
  assert.equal(withoutAsking(by.sourcing!, enabled, policy), 'Adds to shortlist');
  assert.equal(withoutAsking(by.coordinator!, enabled, policy), 'Reminders auto');
  assert.equal(withoutAsking(by.outreach!, enabled, policy), 'Drafts only, locked');
  assert.equal(withoutAsking(by.screening!, enabled, policy), 'Drafts only, locked');
  assert.equal(withoutAsking(by.account!, enabled, policy), 'Drafts only');
  assert.equal(withoutAsking(by.intake!, enabled, policy), 'Drafts only');
});

test('runs are per agent, newest first, with totals and firm-local times', () => {
  const runs = runsFor(representativeRuns(at), 'sourcing');
  assert.deepEqual(
    runs.map((r) => r.id),
    ['r1', 'r2', 'r3'],
  );
  assert.deepEqual(runTotals(runs), { count: 3, failed: 1, costCents: 296 });
  assert.equal(formatCost(184), '$1.84');
  assert.equal(formatRunTime(runs[0]!.at, now, TZ), 'Today 2:00 AM');
  assert.equal(formatRunTime(runs[1]!.at, now, TZ), 'Yesterday 2:00 AM');
  assert.equal(formatRunTime(runs[2]!.at, now, TZ), 'Nov 22 2:00 AM');
  assert.ok(representativeRuns(at).every((r) => r.at <= now.toISOString()));
});

test('connections list disconnected first and show how fresh each sync is', () => {
  const rows = sortConnections(representativeConnections(ago));
  assert.equal(rows[0]!.name, 'SAP Fieldglass');
  assert.equal(rows[1]!.status, 'tasks-only');
  assert.deepEqual(
    rows.slice(2).map((r) => r.name),
    [...rows.slice(2).map((r) => r.name)].sort((a, b) => a.localeCompare(b)),
  );
  assert.equal(formatSync(ago(0), now, TZ), 'Just now');
  assert.equal(formatSync(ago(12), now, TZ), '12 min ago');
  assert.equal(formatSync(ago(6 * 60 + 12), now, TZ), 'Today 3:48 AM');
  assert.deepEqual(capOptions(80), [40, 60, 80]);
});

test('out of office needs both days in order, not in the past, and a cover', () => {
  const today = '2026-11-25';
  const ok = { from: '2026-12-24', until: '2027-01-02', coverId: 'sam' };
  assert.equal(outOfOfficeError({ from: '', until: '', coverId: '' }, today), null);
  assert.equal(outOfOfficeError(ok, today), null);
  assert.match(outOfOfficeError({ ...ok, until: '' }, today)!, /both/);
  assert.match(outOfOfficeError({ ...ok, until: '2026-12-01' }, today)!, /before/);
  assert.match(
    outOfOfficeError({ ...ok, from: '2026-11-01', until: '2026-11-10' }, today)!,
    /past/,
  );
  assert.match(outOfOfficeError({ ...ok, coverId: '' }, today)!, /covers/);
});
