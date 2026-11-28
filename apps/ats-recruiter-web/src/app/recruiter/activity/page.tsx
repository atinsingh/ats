import { ActivityLogBoard } from '../../../components/activity/ActivityLogBoard';
import { RecruiterShell } from '../../../components/RecruiterShell';
import type { ActivityEvent } from '../../../lib/activity/activity';
import { toActivityEvents } from '../../../lib/activity/live';
import { loadColleagueNames } from '../../../lib/colleagues/names';
import { representativeActivity } from '../../../lib/activity/representative';
import { localDay, zonedToIso } from '../../../lib/interviews/interviews';
import { readRecruiterConfig, type RecruiterConfig } from '../../../lib/recruiter-config';
import { loadSubmittalNames, recruiterClient } from '../../../lib/submittals/names';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';

/** The tenant's real activity, or null when application-service can't be reached. */
async function loadActivity(cfg: RecruiterConfig): Promise<ActivityEvent[] | null> {
  if (!cfg.applicationServiceUrl) return null;
  try {
    const rows = await recruiterClient(cfg, cfg.applicationServiceUrl).activity.list(200);
    const colleagues = loadColleagueNames(cfg);
    const names = await loadSubmittalNames(
      cfg,
      rows.map((r) => ({
        candidateProfileId: r.candidateProfileId ?? '',
        jobId: r.jobId ?? '',
        clientId: null,
      })),
    );
    return toActivityEvents(rows, names, cfg.recruiterUserId, await colleagues);
  } catch {
    return null;
  }
}

export default async function ActivityPage() {
  // Real activity whenever application-service answers: pipeline moves, AI drafts and the people
  // who decided on them, and submittals approved as sent. Otherwise labelled representative data.
  // The page only reads; it never edits or deletes an event.
  const cfg = readRecruiterConfig();
  const now = new Date();
  const today = localDay(now, FIRM_TIME_ZONE);
  const at = (daysAgo: number, time: string) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    const iso = zonedToIso(d.toISOString().slice(0, 10), time, FIRM_TIME_ZONE);
    return iso > now.toISOString() ? now.toISOString() : iso;
  };
  const live = await loadActivity(cfg);

  return (
    <RecruiterShell
      hideNewJob
      title="Activity log"
      subtitle="Every action by people, agents and the system, newest first. Overrides show the reason given, and agent actions show who approved them."
    >
      <ActivityLogBoard
        events={live ?? representativeActivity(at)}
        now={now.toISOString()}
        timeZone={FIRM_TIME_ZONE}
        representative={live === null}
      />
    </RecruiterShell>
  );
}
