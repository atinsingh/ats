import type { SubmittalRecord } from '@jobocate/api-sdk';

import { RecruiterShell } from '../../../components/RecruiterShell';
import { SubmittalsBoard } from '../../../components/submittals/SubmittalsBoard';
import { readRecruiterConfig, type RecruiterConfig } from '../../../lib/recruiter-config';
import { toSubmittalRows } from '../../../lib/submittals/live';
import { loadSubmittalNames, recruiterClient } from '../../../lib/submittals/names';
import { representativeSubmittals } from '../../../lib/submittals/representative';
import type { Submittal } from '../../../lib/submittals/submittals';

export const dynamic = 'force-dynamic';

/** The tenant's real submittals, or null when application-service can't be reached. */
async function loadSubmittals(cfg: RecruiterConfig): Promise<Submittal[] | null> {
  if (!cfg.applicationServiceUrl) return null;
  let rows: SubmittalRecord[];
  try {
    rows = await recruiterClient(cfg, cfg.applicationServiceUrl).submittals.list({ limit: 200 });
  } catch {
    return null;
  }
  return toSubmittalRows(rows, await loadSubmittalNames(cfg, rows), cfg.recruiterUserId);
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
