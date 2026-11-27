import type { AiArtifact, AiArtifactKind, AiArtifactSubjectType } from '@jobocate/api-sdk';

import type { Check, Proposal } from './queue';

/**
 * Maps AI drafts waiting for review (application-service ai-artifacts) onto Review queue
 * proposals. Approving a draft only marks it approved: nothing is sent to anyone from the queue,
 * and an approved recommendation never moves an application by itself.
 */

/** How long a decision waits before it is sent, so Undo can still take it back. */
export const UNDO_WINDOW_MS = 8_000;

export const ARTIFACT_LABEL: Record<AiArtifactKind, string> = {
  RESUME_VARIANT: 'Tailored resume',
  COVER_LETTER: 'Cover letter',
  CANDIDATE_SUMMARY: 'Candidate summary',
  MATCH_EXPLANATION: 'Match explanation',
  INTERVIEW_QA: 'Interview questions and answers',
  REJECTION_EMAIL: 'Rejection email',
  SCREENING_QUESTIONS: 'Screening questions',
  SHORTLIST_RECOMMENDATION: 'Shortlist recommendation',
};

const SUBJECT_LABEL: Record<AiArtifactSubjectType, string> = {
  CANDIDATE_PROFILE: 'a candidate profile',
  APPLICATION: 'an application',
  JOB: 'a job',
  RESUME: 'a resume',
  INTERVIEW: 'an interview',
};

/** Kinds that are about a decision on a candidate. A person still makes that decision. */
const ABOUT_A_DECISION = new Set<AiArtifactKind>(['SHORTLIST_RECOMMENDATION', 'REJECTION_EMAIL']);

/** "Waiting under an hour", "Waiting 3 hours", "Waiting 2 days". */
export function waitingLabel(sinceIso: string, now: Date): string {
  const hours = Math.max(0, Math.floor((now.getTime() - Date.parse(sinceIso)) / 3_600_000));
  if (hours < 1) return 'Waiting under an hour';
  if (hours < 48) return `Waiting ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = Math.floor(hours / 24);
  return `Waiting ${days} days`;
}

export function artifactToProposal(a: AiArtifact, now: Date = new Date()): Proposal {
  const label = ARTIFACT_LABEL[a.kind] ?? a.kind;
  const since = a.readyAt ?? a.createdAt;
  const checks: Check[] = [];
  if (ABOUT_A_DECISION.has(a.kind)) {
    checks.push({
      status: 'warn',
      title: 'A person decides',
      detail:
        'Approving this draft does not move or reject the application. Change its stage yourself.',
    });
  }
  const hasText = typeof a.outputText === 'string' && a.outputText.trim().length > 0;
  return {
    id: a.id,
    kind: a.kind === 'REJECTION_EMAIL' ? 'message' : 'ai-draft',
    agent: 'AI drafting',
    title: `${label} for ${SUBJECT_LABEL[a.subjectEntityType] ?? 'a record'}`,
    summary: hasText
      ? `Drafted by ${a.modelVersion}, prompt ${a.promptVersion}.`
      : `Drafted by ${a.modelVersion}, prompt ${a.promptVersion}. The draft is stored as a file; open it from the record.`,
    draft: hasText ? a.outputText! : undefined,
    editable: false,
    destination: 'nowhere yet. It is marked approved, and nothing is sent to anyone from here',
    dueAt: since,
    dueLabel: waitingLabel(since, now),
    approveLabel: 'Approve draft',
    checks,
    evidence: [],
  };
}

type Timer = {
  set: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clear: (t: ReturnType<typeof setTimeout>) => void;
};

/**
 * Holds each decision for the undo window before sending it. Cancelling inside the window sends
 * nothing. Timers are injectable so the rule is unit-tested.
 */
export class DeferredSends {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly jobs = new Map<string, () => void>();

  private readonly delayMs: number;
  private readonly timer: Timer;

  constructor(
    delayMs: number = UNDO_WINDOW_MS,
    timer: Timer = { set: (fn, ms) => setTimeout(fn, ms), clear: (t) => clearTimeout(t) },
  ) {
    this.delayMs = delayMs;
    this.timer = timer;
  }

  schedule(id: string, send: () => void): void {
    this.cancel(id);
    const run = () => {
      this.timers.delete(id);
      this.jobs.delete(id);
      send();
    };
    this.jobs.set(id, run);
    this.timers.set(id, this.timer.set(run, this.delayMs));
  }

  /** True when a send was waiting and is now cancelled. */
  cancel(id: string): boolean {
    const t = this.timers.get(id);
    if (t === undefined) return false;
    this.timer.clear(t);
    this.timers.delete(id);
    this.jobs.delete(id);
    return true;
  }

  isPending(id: string): boolean {
    return this.timers.has(id);
  }

  /** Send everything still waiting now, e.g. when the person moves to another page. */
  flush(): void {
    for (const id of [...this.jobs.keys()]) {
      const run = this.jobs.get(id)!;
      this.timer.clear(this.timers.get(id)!);
      run();
    }
  }
}
