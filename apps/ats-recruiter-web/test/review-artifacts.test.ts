import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { AiArtifact } from '@jobocate/api-sdk';

import {
  DeferredSends,
  UNDO_WINDOW_MS,
  artifactToProposal,
  waitingLabel,
} from '../src/lib/review/artifacts.ts';
import { canEdit, decide, emptyQueue, isBlocked, removeDecision } from '../src/lib/review/queue.ts';

const NOW = new Date('2026-11-27T15:00:00Z');

const artifact = (over: Partial<AiArtifact> = {}): AiArtifact => ({
  id: 'a1',
  kind: 'COVER_LETTER',
  subjectEntityType: 'CANDIDATE_PROFILE',
  subjectEntityId: 'c1',
  promptVersion: 'v3',
  modelVersion: 'model-x',
  status: 'READY_FOR_REVIEW',
  reviewRequired: true,
  outputText: 'Dear hiring team',
  createdAt: '2026-11-27T10:00:00Z',
  readyAt: '2026-11-27T12:00:00Z',
  ...over,
});

test('an AI draft maps to a proposal that can be approved or rejected but not edited', () => {
  const p = artifactToProposal(artifact(), NOW);
  assert.equal(p.kind, 'ai-draft');
  assert.equal(p.title, 'Cover letter for a candidate profile');
  assert.equal(p.draft, 'Dear hiring team');
  assert.equal(p.dueAt, '2026-11-27T12:00:00Z');
  assert.equal(p.dueLabel, 'Waiting 3 hours');
  assert.equal(canEdit(p), false);
  assert.equal(isBlocked(p), false);
  assert.match(p.destination, /nothing is sent/);
  assert.throws(() => decide(emptyQueue(), p, { outcome: 'edited', draft: 'x' }), /cannot be edited/);
  assert.equal(decide(emptyQueue(), p, { outcome: 'approved' }).decisions.a1?.outcome, 'approved');
});

test('drafts about a decision on a candidate say a person still decides', () => {
  for (const kind of ['SHORTLIST_RECOMMENDATION', 'REJECTION_EMAIL'] as const) {
    const p = artifactToProposal(artifact({ kind }), NOW);
    assert.equal(p.checks.length, 1);
    assert.equal(p.checks[0]!.status, 'warn');
    assert.equal(p.checks[0]!.title, 'A person decides');
  }
  assert.equal(artifactToProposal(artifact({ kind: 'REJECTION_EMAIL' }), NOW).kind, 'message');
});

test('a draft stored only as a file has no inline text and falls back to createdAt', () => {
  const p = artifactToProposal(artifact({ outputText: null, readyAt: null, outputS3Key: 'k' }), NOW);
  assert.equal(p.draft, undefined);
  assert.match(p.summary, /stored as a file/);
  assert.equal(p.dueAt, '2026-11-27T10:00:00Z');
});

test('waitingLabel', () => {
  assert.equal(waitingLabel('2026-11-27T14:30:00Z', NOW), 'Waiting under an hour');
  assert.equal(waitingLabel('2026-11-27T14:00:00Z', NOW), 'Waiting 1 hour');
  assert.equal(waitingLabel('2026-11-25T14:00:00Z', NOW), 'Waiting 2 days');
});

function fakeTimer() {
  let nextId = 1;
  const due = new Map<number, () => void>();
  return {
    timer: {
      set: (fn: () => void) => {
        const id = nextId++;
        due.set(id, fn);
        return id as unknown as ReturnType<typeof setTimeout>;
      },
      clear: (t: ReturnType<typeof setTimeout>) => void due.delete(t as unknown as number),
    },
    fireAll: () => {
      for (const [id, fn] of [...due]) {
        due.delete(id);
        fn();
      }
    },
    size: () => due.size,
  };
}

test('a decision is sent only when the undo window closes', () => {
  const t = fakeTimer();
  const sends = new DeferredSends(UNDO_WINDOW_MS, t.timer);
  const sent: string[] = [];
  sends.schedule('a1', () => sent.push('a1'));
  assert.equal(sends.isPending('a1'), true);
  assert.deepEqual(sent, []);
  t.fireAll();
  assert.deepEqual(sent, ['a1']);
  assert.equal(sends.isPending('a1'), false);
  assert.equal(sends.cancel('a1'), false, 'too late to cancel');
});

test('undo inside the window sends nothing', () => {
  const t = fakeTimer();
  const sends = new DeferredSends(UNDO_WINDOW_MS, t.timer);
  const sent: string[] = [];
  sends.schedule('a1', () => sent.push('a1'));
  assert.equal(sends.cancel('a1'), true);
  t.fireAll();
  assert.deepEqual(sent, []);
  assert.equal(t.size(), 0);
});

test('flush sends everything still waiting, once', () => {
  const t = fakeTimer();
  const sends = new DeferredSends(UNDO_WINDOW_MS, t.timer);
  const sent: string[] = [];
  sends.schedule('a1', () => sent.push('a1'));
  sends.schedule('a2', () => sent.push('a2'));
  sends.flush();
  t.fireAll();
  assert.deepEqual(sent, ['a1', 'a2']);
});

test('removeDecision puts a proposal back in the queue', () => {
  const p = artifactToProposal(artifact(), NOW);
  const q = decide(emptyQueue(), p, { outcome: 'rejected' });
  const back = removeDecision(q, 'a1');
  assert.equal(back.decisions.a1, undefined);
  assert.deepEqual(back.history, []);
  assert.equal(removeDecision(back, 'a1'), back);
});
