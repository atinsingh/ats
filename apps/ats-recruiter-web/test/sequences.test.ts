import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDays,
  fillTemplate,
  nextStep,
  outOfQuietHours,
  sequenceStats,
  type Enrollee,
} from '../src/lib/sequences/sequences.ts';
import {
  SAMPLE_VARS,
  representativeEnrollees,
  representativeSequence,
  representativeTemplates,
} from '../src/lib/sequences/representative.ts';

const TZ = 'America/Toronto';
// Toronto is UTC-5 in late November.
const toIso = (day: string, time: string) => {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCHours(h! + 5, m!);
  return d.toISOString();
};
const today = '2026-11-26';
const day = (n: number) => addDays(today, -n);
const at = (h: number) => new Date(toIso(today, `${String(h).padStart(2, '0')}:00`));
const seq = representativeSequence();
const by = (id: string) => representativeEnrollees(day).find((e) => e.id === id)!;

test('quiet hours move sends to the next 8:00 AM', () => {
  assert.equal(outOfQuietHours(toIso(today, '06:30'), TZ, toIso), toIso(today, '08:00'));
  assert.equal(outOfQuietHours(toIso(today, '21:15'), TZ, toIso), toIso('2026-11-27', '08:00'));
  assert.equal(outOfQuietHours(toIso(today, '13:00'), TZ, toIso), toIso(today, '13:00'));
});

test('stop rules win, then pause; the first message always needs approval', () => {
  assert.deepEqual(nextStep(seq, by('e4'), at(10), TZ, toIso), {
    kind: 'stopped',
    reason: 'replied',
  });
  assert.deepEqual(nextStep({ ...seq, paused: true }, by('e1'), at(10), TZ, toIso), {
    kind: 'paused',
  });
  const first = nextStep(seq, by('e1'), at(7), TZ, toIso);
  assert.equal(first.kind, 'send');
  if (first.kind === 'send') {
    assert.equal(first.index, 0);
    assert.equal(first.needsApproval, true);
    assert.equal(first.at, toIso(today, '09:00'));
  }
});

test('SMS steps are skipped without SMS consent; overdue steps go out now', () => {
  // Daniel has email only: day 3 SMS is skipped, so day 7 email on Dec 1 is next.
  const daniel = nextStep(seq, by('e3'), at(10), TZ, toIso);
  assert.equal(daniel.kind === 'send' && daniel.index, 2);
  assert.equal(daniel.kind === 'send' && daniel.at, toIso('2026-11-27', '09:00'));
  assert.equal(daniel.kind === 'send' && daniel.needsApproval, false);
  // Amara consented to SMS: day 3 SMS is due today at 9:00, already past at 10:00, so now.
  const amara = nextStep(seq, by('e2'), at(10), TZ, toIso);
  assert.equal(amara.kind === 'send' && amara.step.channel, 'sms');
  assert.equal(amara.kind === 'send' && amara.at, at(10).toISOString());
  // Overdue at 10 PM waits for 8:00 AM tomorrow.
  const late = nextStep(seq, by('e2'), at(22), TZ, toIso);
  assert.equal(late.kind === 'send' && late.at, toIso('2026-11-27', '08:00'));
  // Every step handled means done.
  assert.deepEqual(nextStep(seq, by('e5'), at(10), TZ, toIso), { kind: 'done' });
  // Without an approved first message, a later step still needs approval.
  const unapproved: Enrollee = { ...by('e3'), firstApproved: false };
  const u = nextStep(seq, unapproved, at(10), TZ, toIso);
  assert.equal(u.kind === 'send' && u.needsApproval, true);
});

test('stats and templates: a missing variable blocks sending', () => {
  assert.deepEqual(sequenceStats(representativeEnrollees(day)), {
    total: 7,
    replied: 1,
    optedOut: 1,
    active: 4,
  });
  const [first, , confirm] = representativeTemplates();
  const ok = fillTemplate(first!.body, SAMPLE_VARS);
  assert.deepEqual(ok.missing, []);
  assert.match(ok.text, /^Hi Wei, I am recruiting a Senior Java Developer/);
  const blocked = fillTemplate(confirm!.body, { ...SAMPLE_VARS, first_name: '  ' });
  assert.deepEqual(blocked.missing, ['first_name', 'interview_time']);
  assert.match(blocked.text, /\{interview_time\}/);
});
