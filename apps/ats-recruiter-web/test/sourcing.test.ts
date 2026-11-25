import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decide, emptyQueue, isBlocked } from '../src/lib/review/queue.ts';
import { representativeTargets } from '../src/lib/sourcing/representative.ts';
import {
  rankTargets,
  targetChecks,
  territoryCheck,
  toProposal,
  unfilledPlaceholders,
  type SourcingTarget,
} from '../src/lib/sourcing/sourcing.ts';

const base: SourcingTarget = {
  id: 't',
  company: 'Tailspin',
  meta: '',
  signal: 'New VP Engineering',
  signalSource: 'Press release',
  benchReady: 2,
  contactRole: 'VP Engineering',
  owner: 'You',
  draft: 'Hi [NAME], hello from [FIRM NAME]. [NAME], are you free? [sic]',
  profiles: ['QA lead, 10 yrs'],
};

test('unfilledPlaceholders finds each upper-case placeholder once', () => {
  assert.deepEqual(unfilledPlaceholders(base.draft), ['[NAME]', '[FIRM NAME]']);
  assert.deepEqual(unfilledPlaceholders('Hi Dana, thanks.'), []);
});

test('territory: yours or unassigned passes, another desk blocks', () => {
  assert.equal(territoryCheck(base).status, 'pass');
  assert.equal(territoryCheck({ ...base, owner: 'Unassigned' }).status, 'pass');
  const other = territoryCheck({ ...base, owner: 'Ben C.' });
  assert.equal(other.status, 'fail');
  assert.equal(other.title, "Owned by Ben C.'s desk");
});

test('targetChecks warns on blanks and only mentions profiles when there are some', () => {
  const titles = targetChecks(base).map((c) => c.title);
  assert.ok(titles.includes('Fill in [NAME], [FIRM NAME] before approving'));
  assert.ok(titles.includes('Featured candidates are anonymised'));
  const plain = targetChecks({ ...base, draft: 'Hello.', profiles: [] }).map((c) => c.title);
  assert.deepEqual(plain, ['Territory is yours', 'Verify the contact before sending']);
});

test('rankTargets puts open territory first, then bench match', () => {
  assert.deepEqual(
    rankTargets(representativeTargets()).map((t) => t.id),
    ['woodgrove', 'tailspin', 'adventure', 'fabrikam'],
  );
});

test('a target owned by another desk becomes a blocked proposal; approving it throws', () => {
  const now = new Date('2026-11-25T17:00:00Z');
  const fab = toProposal(representativeTargets()[0]!, now);
  assert.equal(fab.agent, 'Client sourcing');
  assert.equal(fab.kind, 'message');
  assert.ok(isBlocked(fab));
  assert.throws(() => decide(emptyQueue(), fab, { outcome: 'approved' }), /blocked/);
  // Skipping is always allowed.
  assert.equal(
    decide(emptyQueue(), fab, { outcome: 'rejected' }).decisions[fab.id]?.outcome,
    'rejected',
  );
  const tail = toProposal({ ...base, draft: 'Hi Dana.' }, now);
  assert.equal(isBlocked(tail), false);
  assert.equal(tail.destination, 'by email from your mailbox to the VP Engineering');
  assert.equal(
    decide(emptyQueue(), tail, { outcome: 'edited', draft: ' Hi Dana! ' }).decisions[tail.id]
      ?.draft,
    'Hi Dana!',
  );
});
