import { RecruiterShell } from '../../../components/RecruiterShell';
import { TalentSearchBoard } from '../../../components/talent/TalentSearchBoard';
import { localDay } from '../../../lib/interviews/interviews';
import { readRecruiterConfig, type RecruiterConfig } from '../../../lib/recruiter-config';
import { recruiterClient } from '../../../lib/submittals/names';
import { jobToParts, toTalentJob } from '../../../lib/talent/live';
import {
  representativeSavedSearches,
  representativeTalentJobs,
  type TalentJob,
} from '../../../lib/talent/representative';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';
/** Open jobs searched on page load. */
const MAX_JOBS = 10;

/** Candidates on a placement covering today, or null when placements can't be loaded. */
async function onAssignmentIds(cfg: RecruiterConfig, today: string): Promise<Set<string> | null> {
  if (!cfg.applicationServiceUrl) return null;
  try {
    const rows = await recruiterClient(cfg, cfg.applicationServiceUrl).placements.list(500);
    return new Set(
      rows
        .filter((p) => p.startDate <= today && today <= p.endDate)
        .map((p) => p.candidateProfileId),
    );
  } catch {
    return null;
  }
}

/**
 * Open jobs with their own-database matches, or null when job-service or candidate-service can't
 * be reached. One job's failed search leaves that job with no matches.
 */
async function loadTalent(cfg: RecruiterConfig, today: string): Promise<TalentJob[] | null> {
  if (!cfg.jobServiceUrl || !cfg.candidateServiceUrl) return null;
  const people = recruiterClient(cfg, cfg.candidateServiceUrl);
  // People on assignment today are left out, as the database note promises. Without
  // application-service the search can't keep that promise, so the page falls back to samples.
  const onAssignment = await onAssignmentIds(cfg, today);
  if (onAssignment === null) return null;
  try {
    const jobs = (await recruiterClient(cfg, cfg.jobServiceUrl).jobs.listOpen()).slice(0, MAX_JOBS);
    return await Promise.all(
      jobs.map(async (job) => {
        const parts = jobToParts(job);
        const matches = await people.recruiterCandidates
          .search({ titles: parts.titles, skills: parts.skills, exclude: parts.exclude, limit: 25 })
          .catch(() => []);
        return toTalentJob(
          job,
          matches.filter((m) => !onAssignment.has(m.id)),
          today,
        );
      }),
    );
  } catch {
    return null;
  }
}

export default async function TalentSearchPage() {
  // Real open jobs and your own database whenever job-service and candidate-service answer.
  // Saved searches have no service yet, so the live page shows none. Otherwise labelled samples.
  const cfg = readRecruiterConfig();
  const live = await loadTalent(cfg, localDay(new Date(), FIRM_TIME_ZONE));
  return (
    <RecruiterShell
      hideNewJob
      title="Talent search"
      subtitle="Search strings written from the job's must-haves, one per source. Your own database runs first: most placements come from people a firm already knows."
    >
      <TalentSearchBoard
        jobs={live ?? representativeTalentJobs()}
        saved={live ? [] : representativeSavedSearches()}
        representative={live === null}
      />
    </RecruiterShell>
  );
}
