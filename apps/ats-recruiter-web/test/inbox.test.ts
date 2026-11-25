import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decide, emptyQueue, isBlocked } from '../src/lib/review/queue.ts';
import {
  filterConversations,
  formatWhen,
  replyBlockedReason,
  sortByLatest,
  toReplyProposal,
  unreadCount,
  type Conversation,
} from '../src/lib/inbox/inbox.ts';
import { representativeInbox } from '../src/lib/inbox/representative.ts';

const now = new Date('2026-11-25T17:00:00Z');
const rows = representativeInbox(now);
const byId = (id: string) => rows.find((c) => c.id === id)!;

test('sortByLatest puts the newest message first and empty threads last', () => {
  assert.deepEqual(
    sortByLatest(rows).map((c) => c.id),
    ['marcus', 'dana', 'beeline', 'hana', 'amara', 'lena', 'jordan-sms'],
  );
});

test('filters by channel and by who wrote', () => {
  assert.deepEqual(
    filterConversations(rows, { channel: 'sms' }).map((c) => c.id),
    ['amara', 'jordan-sms'],
  );
  assert.deepEqual(
    filterConversations(rows, { from: 'clients' }).map((c) => c.id),
    ['dana'],
  );
  const people = filterConversations(rows, { from: 'candidates', channel: 'all' }).map((c) => c.id);
  assert.ok(people.includes('lena')); // contractors count as candidates here
  assert.ok(!people.includes('beeline'));
});

test('unreadCount drops conversations opened in this session', () => {
  assert.equal(unreadCount(rows, new Set()), 4);
  assert.equal(unreadCount(rows, new Set(['marcus', 'amara'])), 3);
});

test('reply rules: they wrote first, or consent on the same channel; never to VMS alerts', () => {
  assert.equal(replyBlockedReason(byId('marcus')), null);
  assert.match(replyBlockedReason(byId('beeline'))!, /VMS alerts/);
  // Consent is on email, the suggestion is a text.
  assert.equal(
    replyBlockedReason(byId('jordan-sms')),
    'No consent recorded to contact Jordan P. by SMS.',
  );
  const emailFirst: Conversation = { ...byId('jordan-sms'), channel: 'email' };
  assert.equal(replyBlockedReason(emailFirst), null);
});

test('suggested replies become proposals; a blocked one cannot be sent', () => {
  assert.equal(toReplyProposal(byId('hana')), null);
  const marcus = toReplyProposal(byId('marcus'))!;
  assert.equal(marcus.approveLabel, 'Send reply');
  assert.equal(marcus.destination, 'by email from your mailbox to Marcus T.');
  assert.equal(isBlocked(marcus), false);
  const jordan = toReplyProposal(byId('jordan-sms'))!;
  assert.equal(jordan.destination, 'by SMS from your number to Jordan P.');
  assert.ok(isBlocked(jordan));
  assert.throws(() => decide(emptyQueue(), jordan, { outcome: 'approved' }), /blocked/);
  assert.equal(
    decide(emptyQueue(), jordan, { outcome: 'rejected' }).decisions[jordan.id]?.outcome,
    'rejected',
  );
});

test('formatWhen shows a time today, Yesterday, then a date', () => {
  const tz = 'America/Toronto';
  assert.equal(formatWhen('2026-11-25T14:12:00Z', now, tz), '9:12 AM');
  assert.equal(formatWhen('2026-11-24T14:12:00Z', now, tz), 'Yesterday');
  assert.equal(formatWhen('2026-11-22T14:12:00Z', now, tz), 'Nov 22');
});
