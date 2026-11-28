import { createJobocateClient, type SubmittalRecord } from '@jobocate/api-sdk';

import { RecruiterShell } from '../../../components/RecruiterShell';
import { SubmittalsBoard } from '../../../components/submittals/SubmittalsBoard';
import { readRecruiterConfig, type RecruiterConfig } from '../../../lib/recruiter-config';
import { idsToLookUp, toSubmittalRows } from '../../../lib/submittals/live';
import { representativeSubmittals } from '../../../lib/submittals/representative';
import type { Submittal } from '../../../lib/submittals/submittals';

export const dynamic = 'force-dynamic';

/** Looks up names by id; a failed or missing lookup just leaves that id out. */
async function lookUp(ids: string[], fetchName: (id: string) => Promise<string>) {
  const names = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      try {
        names.set(id, await fetchName(id));
      } catch {
        // The row says "not found" instead.
      }
    }),
  );
  return names;
}

/** The tenant's real submittals, or null when application-service can't be reached. */
async function loadSubmittals(cfg: RecruiterConfig): Promise<Submittal[] | null> {
  if (!cfg.applicationServiceUrl) return null;
  const client = (baseUrl: string) =>
    createJobocateClient({
      baseUrl,
      getTenantId: () => cfg.tenantId,
      getUserId: () => cfg.recruiterUserId,
    });
  let rows: SubmittalRecord[];
  try {
    rows = await client(cfg.applicationServiceUrl).submittals.list({ limit: 200 });
  } catch {
    return null;
  }
  const jobs = cfg.jobServiceUrl ? client(cfg.jobServiceUrl) : null;
  const people = cfg.candidateServiceUrl ? client(cfg.candidateServiceUrl) : null;
  const [candidates, jobTitles, clients] = await Promise.all([
    people
      ? lookUp(idsToLookUp(rows.map((r) => r.candidateProfileId)), async (id) =>
          (await people.recruiterCandidates.get(id)).fullName,
        )
      : new Map<string, string>(),
    jobs
      ? lookUp(idsToLookUp(rows.map((r) => r.jobId)), async (id) => (await jobs.jobs.get(id)).title)
      : new Map<string, string>(),
    jobs
      ? lookUp(idsToLookUp(rows.map((r) => r.clientId)), async (id) =>
          (await jobs.clients.get(id)).name,
        )
      : new Map<string, string>(),
  ]);
  return toSubmittalRows(rows, { candidates, jobs: jobTitles, clients }, cfg.recruiterUserId);
}

export default async function SubmittalsPage() {
  // Real submittals whenever application-service answers, with names looked up from the
  // candidate and job services. Otherwise the page falls back to labelled representative data.
  const cfg = readRecruiterConfig();
  const now = new Date();
  const live = await loadSubmittals(cfg);
  return (
    <RecruiterShell
      hideNewJob
      title="Submittals"
      subtitle="Everyone you have put forward, by client and status. A client silent for more than 3 business days is flagged for a follow-up."
    >
      <SubmittalsBoard
        submittals={live ?? representativeSubmittals(now)}
        now={now.toISOString()}
        representative={live === null}
      />
    </RecruiterShell>
  );
}
