import type { ActivityRecord } from '@jobocate/api-sdk';

import type { SubmittalNames } from '../submittals/live';
import type { ActivityEvent, ActorKind, EventType } from './activity';

/** Real activity from application-service, worded for the Activity log. */

const KIND: Record<string, string> = {
  RESUME_VARIANT: 'tailored resume',
  COVER_LETTER: 'cover letter',
  CANDIDATE_SUMMARY: 'candidate summary',
  MATCH_EXPLANATION: 'match explanation',
  INTERVIEW_QA: 'interview prep pack',
  REJECTION_EMAIL: 'rejection email',
  SCREENING_QUESTIONS: 'set of screening questions',
  SHORTLIST_RECOMMENDATION: 'shortlist recommendation',
};

/** "NEW_KIND" reads as "new kind". */
const lower = (code: string) => code.toLowerCase().replace(/_/g, ' ');
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const kind = (code: string | null | undefined) => (code ? (KIND[code] ?? lower(code)) : 'draft');

/** Timeline entries that are not a plain status change. */
const TIMELINE: Record<string, string> = {
  APPLIED: 'Application received',
  STAGE_MOVE: 'Moved to another stage',
  NOTE_ADDED: 'Added a note',
  TAG_ADDED: 'Added a tag',
  TAG_REMOVED: 'Removed a tag',
  RATING_ADDED: 'Added a rating',
  RESUME_REPLACED: 'Replaced the resume',
  INTERVIEW_SCHEDULED: 'Scheduled an interview',
  INTERVIEW_RESCHEDULED: 'Rescheduled an interview',
  INTERVIEW_CANCELLED: 'Cancelled an interview',
  INTERVIEW_FEEDBACK_SUBMITTED: 'Submitted interview feedback',
  OFFER_SENT: 'Recorded an offer as sent',
  OFFER_ACCEPTED: 'Recorded an accepted offer',
  OFFER_DECLINED: 'Recorded a declined offer',
  REJECTED: 'Rejected the application',
  WITHDRAWN: 'Recorded a withdrawal',
  HIRED: 'Marked as hired',
  EXPIRED: 'Application expired',
  AI_ARTIFACT_LINKED: 'Linked an AI draft',
};

function actorName(r: ActivityRecord, viewerUserId: string): string {
  if (r.actorKind === 'AGENT') return 'AI agent';
  if (r.actorKind === 'SYSTEM') return 'System';
  if (!r.actorUserId) return 'A recruiter';
  return r.actorUserId === viewerUserId ? 'You' : 'Teammate';
}

function subject(r: ActivityRecord, names: SubmittalNames): string {
  const person = r.candidateProfileId ? names.candidates.get(r.candidateProfileId) : undefined;
  const job = r.jobId ? names.jobs.get(r.jobId) : undefined;
  if (person && job) return `${person} for ${job}`;
  if (person) return person;
  if (job) return job;
  return r.candidateProfileId || r.applicationId ? 'Candidate not found' : '–';
}

function describe(r: ActivityRecord): { type: EventType; action: string; failed?: boolean } {
  switch (r.code) {
    case 'STATUS_CHANGE':
      return {
        type: 'pipeline',
        action:
          r.fromValue && r.toValue
            ? `Moved from ${lower(r.fromValue)} to ${lower(r.toValue)}`
            : `Moved to ${lower(r.toValue ?? 'a new status')}`,
      };
    case 'DRAFT_READY':
      return { type: 'draft', action: `Drafted a ${kind(r.detail)} for review` };
    case 'DRAFT_FAILED':
      return { type: 'draft', action: `Could not draft a ${kind(r.detail)}`, failed: true };
    case 'DRAFT_APPROVED':
      return { type: 'approval', action: `Approved an AI ${kind(r.detail)}` };
    case 'DRAFT_REJECTED':
      return { type: 'override', action: `Rejected an AI ${kind(r.detail)}` };
    case 'SUBMITTAL_APPROVED':
      return {
        type: 'approval',
        action: `Approved a submittal as sent${r.detail ? ` through ${r.detail}` : ''}`,
      };
    default:
      return { type: 'pipeline', action: TIMELINE[r.code] ?? upperFirst(lower(r.code)) };
  }
}

const ACTOR: Record<ActivityRecord['actorKind'], ActorKind> = {
  PERSON: 'person',
  AGENT: 'agent',
  SYSTEM: 'system',
};

export function toActivityEvents(
  rows: readonly ActivityRecord[],
  names: SubmittalNames,
  viewerUserId: string,
): ActivityEvent[] {
  return rows.map((r) => {
    const d = describe(r);
    return {
      id: r.id,
      at: r.at,
      actorKind: ACTOR[r.actorKind] ?? 'system',
      actor: actorName(r, viewerUserId),
      type: d.type,
      action: d.action,
      subject: subject(r, names),
      // Overrides always show a reason, even when none was given.
      reason: d.type === 'override' ? r.reason || 'No reason given' : (r.reason ?? undefined),
      failed: d.failed,
    };
  });
}
