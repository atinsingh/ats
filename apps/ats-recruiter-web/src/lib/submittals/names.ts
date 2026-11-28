import { createJobocateClient, type SubmittalRecord } from '@jobocate/api-sdk';

import type { RecruiterConfig } from '../recruiter-config';
import { idsToLookUp, type SubmittalNames } from './live';

/**
 * Server-side name lookups for submittals: candidates from candidate-service, jobs and clients
 * from job-service. Each kind is capped, and a failed or missing lookup just leaves that id out,
 * so the row reads "not found" instead.
 */

async function lookUp(ids: string[], fetchName: (id: string) => Promise<string>) {
  const names = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      try {
        names.set(id, await fetchName(id));
      } catch {
        // Left out on purpose.
      }
    }),
  );
  return names;
}

export function recruiterClient(cfg: RecruiterConfig, baseUrl: string) {
  return createJobocateClient({
    baseUrl,
    getTenantId: () => cfg.tenantId,
    getUserId: () => cfg.recruiterUserId,
  });
}

/** Any row that names a candidate, a job and maybe a client: submittals and placements. */
export type NamedRow = Pick<SubmittalRecord, 'candidateProfileId' | 'jobId' | 'clientId'>;

export async function loadSubmittalNames(
  cfg: RecruiterConfig,
  rows: readonly NamedRow[],
): Promise<SubmittalNames> {
  const jobs = cfg.jobServiceUrl ? recruiterClient(cfg, cfg.jobServiceUrl) : null;
  const people = cfg.candidateServiceUrl ? recruiterClient(cfg, cfg.candidateServiceUrl) : null;
  const empty = new Map<string, string>();
  const [candidates, jobTitles, clients] = await Promise.all([
    people
      ? lookUp(idsToLookUp(rows.map((r) => r.candidateProfileId)), async (id) =>
          (await people.recruiterCandidates.get(id)).fullName,
        )
      : empty,
    jobs
      ? lookUp(idsToLookUp(rows.map((r) => r.jobId)), async (id) => (await jobs.jobs.get(id)).title)
      : empty,
    jobs
      ? lookUp(idsToLookUp(rows.map((r) => r.clientId)), async (id) =>
          (await jobs.clients.get(id)).name,
        )
      : empty,
  ]);
  return { candidates, jobs: jobTitles, clients };
}
