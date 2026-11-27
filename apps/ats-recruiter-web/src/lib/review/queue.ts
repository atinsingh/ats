/**
 * Review queue logic. Agents only propose; a person approves, edits or rejects every proposal,
 * and a proposal with a failed check can only go out through a written override. Pure, so the
 * rules are unit-tested (test/review-queue.test.ts) and the UI stays thin.
 */

export type ProposalKind = 'submittal' | 'message' | 'job-post' | 'timesheet' | 'ai-draft';
export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface Check {
  status: CheckStatus;
  title: string;
  detail?: string;
}

export interface Evidence {
  requirement: string;
  /** "missing" means not found in the sources, not a judgement about the person. */
  status: 'found' | 'missing';
  mustHave: boolean;
  quote?: string;
  source: string;
}

export interface Proposal {
  id: string;
  kind: ProposalKind;
  /** Which agent drafted it, e.g. "Submittal" or "Outreach". */
  agent: string;
  title: string;
  /** Why the agent proposes it. */
  summary: string;
  /** Message text, when the proposal sends one. */
  draft?: string;
  /** Where it goes if approved, e.g. "by email from your mailbox". */
  destination: string;
  dueAt: string;
  dueLabel: string;
  approveLabel: string;
  checks: Check[];
  evidence: Evidence[];
  /** False when the service cannot store an edited draft, so only approve or reject. */
  editable?: boolean;
}

export type Outcome = 'approved' | 'edited' | 'rejected' | 'overridden';

export interface Decision {
  outcome: Outcome;
  at: string;
  reason?: string;
  draft?: string;
}

export interface QueueState {
  decisions: Readonly<Record<string, Decision>>;
  /** Decided ids, most recent last, for undo. */
  history: readonly string[];
}

export const OVERRIDE_MIN_CHARS = 10;

export const emptyQueue = (): QueueState => ({ decisions: {}, history: [] });

export const isBlocked = (p: Proposal): boolean => p.checks.some((c) => c.status === 'fail');

/** A draft can be edited when it exists, the service can store the edit, and nothing blocks it. */
export const canEdit = (p: Proposal): boolean =>
  p.draft !== undefined && p.editable !== false && !isBlocked(p);

export function sortByDeadline<P extends Proposal>(proposals: readonly P[]): P[] {
  return proposals
    .map((p, i) => ({ p, i, t: Date.parse(p.dueAt) }))
    .sort((x, y) => x.t - y.t || x.i - y.i)
    .map((x) => x.p);
}

export function filterByKind<P extends Proposal>(
  proposals: readonly P[],
  kind: ProposalKind | 'all',
): P[] {
  return kind === 'all' ? [...proposals] : proposals.filter((p) => p.kind === kind);
}

export function pendingCount(proposals: readonly Proposal[], q: QueueState): number {
  return proposals.filter((p) => !q.decisions[p.id]).length;
}

export type DecisionInput =
  | { outcome: 'approved' }
  | { outcome: 'rejected' }
  | { outcome: 'edited'; draft: string }
  | { outcome: 'overridden'; reason: string };

/** Record a person's decision. Throws when the rules do not allow it. */
export function decide(
  q: QueueState,
  p: Proposal,
  input: DecisionInput,
  at: string = new Date().toISOString(),
): QueueState {
  if (q.decisions[p.id]) throw new Error(`${p.id} is already decided; undo first`);
  const blocked = isBlocked(p);
  let decision: Decision;
  switch (input.outcome) {
    case 'approved':
      if (blocked) throw new Error(`${p.id} is blocked by a failed check; override with a reason`);
      decision = { outcome: 'approved', at };
      break;
    case 'edited': {
      if (p.draft === undefined) throw new Error(`${p.id} has no draft to edit`);
      if (p.editable === false) throw new Error(`${p.id} cannot be edited here`);
      if (blocked) throw new Error(`${p.id} is blocked by a failed check; override with a reason`);
      const draft = input.draft.trim();
      if (!draft) throw new Error('The edited draft is empty');
      decision = { outcome: 'edited', at, draft };
      break;
    }
    case 'overridden': {
      if (!blocked) throw new Error(`${p.id} is not blocked; approve it instead`);
      const reason = input.reason.trim();
      if (reason.length < OVERRIDE_MIN_CHARS)
        throw new Error(`An override reason needs at least ${OVERRIDE_MIN_CHARS} characters`);
      decision = { outcome: 'overridden', at, reason };
      break;
    }
    case 'rejected':
      decision = { outcome: 'rejected', at };
      break;
  }
  return { decisions: { ...q.decisions, [p.id]: decision }, history: [...q.history, p.id] };
}

/** Undo the most recent decision. */
export function undo(q: QueueState): QueueState {
  const last = q.history[q.history.length - 1];
  if (last === undefined) return q;
  const decisions = { ...q.decisions };
  delete decisions[last];
  return { decisions, history: q.history.slice(0, -1) };
}

/** Drop one decision, e.g. when sending it failed. */
export function removeDecision(q: QueueState, id: string): QueueState {
  if (!q.decisions[id]) return q;
  const decisions = { ...q.decisions };
  delete decisions[id];
  return { decisions, history: q.history.filter((h) => h !== id) };
}

/** Move the selection by `step` within `ids`, wrapping. Unknown ids select the first. */
export function moveSelection(ids: readonly string[], current: string | null, step: 1 | -1) {
  if (ids.length === 0) return null;
  const i = current === null ? -1 : ids.indexOf(current);
  if (i < 0) return ids[0]!;
  return ids[(i + step + ids.length) % ids.length]!;
}
