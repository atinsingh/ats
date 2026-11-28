import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  businessDaysBetween,
  clientSilence,
  filterSubmittals,
  followUpDue,
  sortSubmittals,
  submittalStats,
  type Submittal,
} from '../src/lib/submittals/submittals.ts';
import { representativeSubmittals } from '../src/lib/submittals/representative.ts';

const base: Submittal = {
  id: 'x',
  candidate: 'Zoë Ålund',
  job: 'QA Lead',
  client: 'Contoso',
  channel: 'direct',
  status: 'client-reviewing',
  billRate: 80,
  latest: '',
  owner: 'You',
};

test('businessDaysBetween skips weekends and counts the end day', () => {
  // 2026-11-20 is a Friday.
  const fri = new Date('2026-11-20T15:00:00Z');
  assert.equal(businessDaysBetween(fri, new Date('2026-11-20T23:00:00Z')), 0);
  assert.equal(businessDaysBetween(fri, new Date('2026-11-22T12:00:00Z')), 0); // Sunday
  assert.equal(businessDaysBetween(fri, new Date('2026-11-23T09:00:00Z')), 1); // Monday
  assert.equal(businessDaysBetween(fri, new Date('2026-11-26T09:00:00Z')), 4); // Thursday
});

test('follow-up is due only after more than 3 business days of client silence', () => {
  const s = { ...base, submittedAt: '2026-11-20T15:00:00Z' };
  assert.equal(followUpDue(s, new Date('2026-11-25T12:00:00Z')), false); // 3 days
  assert.equal(followUpDue(s, new Date('2026-11-26T12:00:00Z')), true); // 4 days
  // A client update resets the clock.
  const touched = { ...s, lastClientActivityAt: '2026-11-24T10:00:00Z' };
  assert.equal(clientSilence(touched, new Date('2026-11-26T12:00:00Z')), 2);
  assert.equal(followUpDue(touched, new Date('2026-11-26T12:00:00Z')), false);
  // Only submittals with the client can be overdue.
  assert.equal(followUpDue({ ...s, status: 'interview' }, new Date('2026-12-30T12:00:00Z')), false);
  assert.equal(clientSilence({ ...base, submittedAt: undefined }, new Date()), null);
});

test('filterSubmittals folds accents and needs every word, plus status and client', () => {
  const rows: Submittal[] = [
    base,
    { ...base, id: 'y', candidate: 'Ravi K.', client: 'Fabrikam', status: 'blocked' },
  ];
  assert.deepEqual(
    filterSubmittals(rows, { query: 'zoe qa' }).map((s) => s.id),
    ['x'],
  );
  assert.deepEqual(
    filterSubmittals(rows, { query: 'zoe fabrikam' }).map((s) => s.id),
    [],
  );
  assert.deepEqual(
    filterSubmittals(rows, { status: 'blocked' }).map((s) => s.id),
    ['y'],
  );
  assert.deepEqual(
    filterSubmittals(rows, { client: 'Contoso', status: 'all', query: ' ' }).map((s) => s.id),
    ['x'],
  );
});

test('sortSubmittals puts what needs you first, then follow-ups, then newest', () => {
  const now = new Date('2026-11-26T12:00:00Z');
  const rows: Submittal[] = [
    { ...base, id: 'old', status: 'interview', submittedAt: '2026-11-01T00:00:00Z' },
    { ...base, id: 'new', status: 'interview', submittedAt: '2026-11-24T00:00:00Z' },
    { ...base, id: 'due', submittedAt: '2026-11-18T00:00:00Z' },
    { ...base, id: 'mine', status: 'awaiting-approval' },
  ];
  assert.deepEqual(
    sortSubmittals(rows, now).map((s) => s.id),
    ['mine', 'due', 'new', 'old'],
  );
});

test('submittalStats on the representative data', () => {
  const now = new Date('2026-11-25T17:00:00Z'); // a Wednesday
  const st = submittalStats(representativeSubmittals(now), now);
  assert.equal(st.submittedThisWeek, 3); // Hana, Amir, Tom
  // Submitted and not withdrawn: Hana, Amir, Tom, Jordan, Sofia. Interview or offer: Tom, Jordan.
  assert.equal(st.submitToInterview, 2 / 5);
  assert.equal(st.waitingOnClients, 2);
  assert.equal(st.followUpsDue, 1); // Hana, 6 calendar days silent
  // Hours from shortlist to submit: 24, 12, 18, 30, 6, 10 -> median of 6 values is 15.
  assert.equal(st.medianHoursToSubmit, 15);
  assert.equal(submittalStats([], now).submitToInterview, null);
  assert.equal(submittalStats([], now).medianHoursToSubmit, null);
});
