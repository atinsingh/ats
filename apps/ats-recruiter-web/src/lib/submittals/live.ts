import type { SubmittalRecord, SubmittalStatus as ApiSubmittalStatus } from '@jobocate/api-sdk';

import type { Submittal, SubmittalStatus } from './submittals';

/** Real submittals from application-service, shaped for the Submittals list. */

const STATUS: Record<ApiSubmittalStatus, SubmittalStatus> = {
  AWAITING_APPROVAL: 'awaiting-approval',
  CLIENT_REVIEWING: 'client-reviewing',
  INTERVIEW: 'interview',
  OFFER: 'offer',
  CLIENT_PASSED: 'client-passed',
  WITHDRAWN: 'withdrawn',
};

/** Names looked up from candidate-service and job-service, by id. */
export interface SubmittalNames {
  candidates: ReadonlyMap<string, string>;
  jobs: ReadonlyMap<string, string>;
  clients: ReadonlyMap<string, string>;
}

/** Same rule as the Clients list: "You", "Teammate" or "Unassigned". */
function ownerLabel(ownerUserId: string | null | undefined, viewerUserId: string): string {
  if (!ownerUserId) return 'Unassigned';
  return ownerUserId === viewerUserId ? 'You' : 'Teammate';
}

/** The latest note, or a plain default for the status. */
function latestOf(r: SubmittalRecord): string {
  if (r.latestNote) return r.latestNote;
  if (r.status === 'AWAITING_APPROVAL') return 'Waiting for your approval';
  return '';
}

export function toSubmittalRows(
  rows: readonly SubmittalRecord[],
  names: SubmittalNames,
  viewerUserId: string,
): Submittal[] {
  return rows.map((r) => ({
    id: r.id,
    candidate: names.candidates.get(r.candidateProfileId) ?? 'Candidate not found',
    job: names.jobs.get(r.jobId) ?? 'Job not found',
    client: r.clientId ? (names.clients.get(r.clientId) ?? 'Client not found') : 'No client set',
    channel: r.channel || 'Direct',
    status: STATUS[r.status] ?? 'awaiting-approval',
    billRate: r.billRate ?? undefined,
    submittedAt: r.submittedAt ?? undefined,
    lastClientActivityAt: r.lastClientActivityAt ?? undefined,
    latest: latestOf(r),
    owner: ownerLabel(r.ownerUserId, viewerUserId),
  }));
}

/** Unique values in first-seen order, capped so the page makes a bounded number of lookups. */
export function idsToLookUp(values: readonly (string | null | undefined)[], cap = 25): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].slice(0, cap);
}
