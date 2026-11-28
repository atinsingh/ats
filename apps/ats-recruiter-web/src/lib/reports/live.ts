import type { DeskReport } from '@jobocate/api-sdk';

import type { AgentResult, FunnelCount, SourceResult } from './reports';

/** The desk report from application-service, shaped for the Reports screen. */

const SOURCE_LABEL: Record<string, string> = {
  DIRECT: 'Careers page and direct',
  JOB_BOARD: 'Job boards',
  IMPORT: 'Imported or sourced',
  REFERRAL: 'Referral',
};

const AGENT_LABEL: Record<string, string> = {
  RESUME_VARIANT: 'Resume tailoring',
  COVER_LETTER: 'Cover letters',
  CANDIDATE_SUMMARY: 'Candidate summaries',
  MATCH_EXPLANATION: 'Match explanations',
  INTERVIEW_QA: 'Interview prep',
  REJECTION_EMAIL: 'Rejection emails',
  SCREENING_QUESTIONS: 'Screening questions',
  SHORTLIST_RECOMMENDATION: 'Shortlist recommendations',
};

/** An unknown code reads as words: "NEW_KIND" becomes "New kind". */
function words(code: string): string {
  const s = code.toLowerCase().replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface LiveReport {
  funnel: FunnelCount[];
  sources: SourceResult[];
  agents: AgentResult[];
}

/** Spend, edits and time saved are not tracked yet, so they stay null and read "–". */
export function toReport(r: DeskReport): LiveReport {
  return {
    funnel: r.funnel.map((s) => ({ stage: s.stage, count: s.count })),
    sources: r.sources.map((s) => ({
      source: SOURCE_LABEL[s.source] ?? words(s.source),
      submitted: s.submitted,
      started: s.started,
      spend: null,
    })),
    agents: r.agents.map((a) => ({
      agent: AGENT_LABEL[a.kind] ?? words(a.kind),
      proposals: a.proposals,
      approved: a.approved,
      edited: null,
      rejected: a.rejected,
      minutesSaved: null,
    })),
  };
}
