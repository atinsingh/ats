import { AgencyBoard } from '../../../components/agency/AgencyBoard';
import { RecruiterShell } from '../../../components/RecruiterShell';
import type { Desk, ManagerItem } from '../../../lib/agency/agency';
import {
  duplicateItems,
  LIVE_AGENCY_NOTE,
  SAMPLE_POLICY_NOTE,
  toDesks,
} from '../../../lib/agency/live';
import {
  representativeDesks,
  representativeManagerItems,
  representativePolicy,
} from '../../../lib/agency/representative';
import { loadColleagueNames } from '../../../lib/colleagues/names';
import { localDay } from '../../../lib/interviews/interviews';
import { readRecruiterConfig, type RecruiterConfig } from '../../../lib/recruiter-config';
import { addDays } from '../../../lib/sequences/sequences';
import { loadSubmittalNames, recruiterClient } from '../../../lib/submittals/names';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';
const WEEK = 7;

/** Real desks and duplicate submittals, or null when either service can't be reached. */
async function loadAgency(
  cfg: RecruiterConfig,
): Promise<{ desks: Desk[]; items: ManagerItem[] } | null> {
  if (!cfg.applicationServiceUrl || !cfg.jobServiceUrl) return null;
  try {
    const colleagues = loadColleagueNames(cfg);
    const [metrics, roles] = await Promise.all([
      recruiterClient(cfg, cfg.applicationServiceUrl).reports.desks(WEEK),
      recruiterClient(cfg, cfg.jobServiceUrl).reports.deskRoles(WEEK),
    ]);
    const names = await loadSubmittalNames(
      cfg,
      metrics.duplicates.map((d) => ({
        candidateProfileId: d.candidateProfileId,
        jobId: '',
        clientId: d.clientId,
      })),
    );
    const people = await colleagues;
    return {
      desks: toDesks(metrics, roles, cfg.recruiterUserId, people),
      items: duplicateItems(metrics.duplicates, names, cfg.recruiterUserId, people),
    };
  } catch {
    return null;
  }
}

export default async function AgencyPage() {
  // Real desk counts whenever application-service and job-service answer; otherwise labelled
  // representative data. The firm AI policy stays a sample until firm settings are stored.
  // The page only reads and links.
  const cfg = readRecruiterConfig();
  const today = localDay(new Date(), FIRM_TIME_ZONE);
  const live = await loadAgency(cfg);

  return (
    <RecruiterShell
      hideNewJob
      title="Agency view"
      subtitle="The firm's view across desks this week: how each desk is doing, the AI policy every desk works inside, and what needs a manager."
    >
      <AgencyBoard
        desks={live?.desks ?? representativeDesks()}
        policy={representativePolicy()}
        items={live?.items ?? representativeManagerItems((n) => addDays(today, n))}
        today={today}
        representative={live === null}
        liveNote={live ? LIVE_AGENCY_NOTE : undefined}
        policyNote={live ? SAMPLE_POLICY_NOTE : undefined}
      />
    </RecruiterShell>
  );
}
