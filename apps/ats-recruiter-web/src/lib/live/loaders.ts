import type { PlacementRecord, SubmittalRecord } from '@jobocate/api-sdk';

import type { Interview } from '../interviews/interviews';
import { jobIdsToLookUp, toAgendaRows } from '../interviews/live';
import { toPlacementRows } from '../placements/live';
import type { Placement } from '../placements/placements';
import type { RecruiterConfig } from '../recruiter-config';
import { artifactToProposal, submittalToProposal } from '../review/artifacts';
import type { Proposal } from '../review/queue';
import { toSubmittalRows } from '../submittals/live';
import { loadSubmittalNames, recruiterClient } from '../submittals/names';
import type { Submittal } from '../submittals/submittals';

/**
 * Server-side loaders shared by the module pages and the Command center. Each returns null when its
 * service can't be reached, so the caller falls back to labelled representative data.
 */

const QUEUE_LIMIT = 100;

/**
 * Real AI drafts and submittals waiting for approval, oldest due first. Null only when neither
 * call answers; one failing still shows the other.
 */
export async function loadLiveProposals(cfg: RecruiterConfig): Promise<Proposal[] | null> {
  if (!cfg.applicationServiceUrl) return null;
  const api = recruiterClient(cfg, cfg.applicationServiceUrl);
  const now = new Date();
  const [artifacts, submittals] = await Promise.allSettled([
    api.aiArtifacts.reviewQueue(QUEUE_LIMIT),
    api.submittals.list({ status: 'AWAITING_APPROVAL', limit: QUEUE_LIMIT }),
  ]);
  if (artifacts.status === 'rejected' && submittals.status === 'rejected') return null;
  const out: Proposal[] = [];
  if (artifacts.status === 'fulfilled') {
    out.push(...artifacts.value.map((a) => artifactToProposal(a, now)));
  }
  if (submittals.status === 'fulfilled' && submittals.value.length) {
    const names = await loadSubmittalNames(cfg, submittals.value);
    out.push(...submittals.value.map((s) => submittalToProposal(s, names, now)));
  }
  return out.sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

/** This week's real interviews, with job titles looked up. */
export async function loadAgenda(cfg: RecruiterConfig): Promise<Interview[] | null> {
  if (!cfg.applicationServiceUrl) return null;
  try {
    const rows = await recruiterClient(cfg, cfg.applicationServiceUrl).interviews.upcoming({
      limit: 100,
    });
    const titles = new Map<string, string>();
    if (cfg.jobServiceUrl) {
      const jobs = recruiterClient(cfg, cfg.jobServiceUrl);
      await Promise.all(
        jobIdsToLookUp(rows).map(async (id) => {
          try {
            titles.set(id, (await jobs.jobs.get(id)).title);
          } catch {
            // A missing or unreachable job leaves "Job not found" on that row.
          }
        }),
      );
    }
    return toAgendaRows(rows, titles);
  } catch {
    return null;
  }
}

/** The tenant's real submittals, with names looked up. */
export async function loadSubmittals(cfg: RecruiterConfig): Promise<Submittal[] | null> {
  if (!cfg.applicationServiceUrl) return null;
  let rows: SubmittalRecord[];
  try {
    rows = await recruiterClient(cfg, cfg.applicationServiceUrl).submittals.list({ limit: 200 });
  } catch {
    return null;
  }
  return toSubmittalRows(rows, await loadSubmittalNames(cfg, rows), cfg.recruiterUserId);
}

/** The tenant's real placements, with names looked up. */
export async function loadPlacements(cfg: RecruiterConfig): Promise<Placement[] | null> {
  if (!cfg.applicationServiceUrl) return null;
  let rows: PlacementRecord[];
  try {
    rows = await recruiterClient(cfg, cfg.applicationServiceUrl).placements.list(200);
  } catch {
    return null;
  }
  return toPlacementRows(rows, await loadSubmittalNames(cfg, rows));
}
