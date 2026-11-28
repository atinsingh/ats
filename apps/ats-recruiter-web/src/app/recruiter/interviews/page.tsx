import { createJobocateClient } from '@jobocate/api-sdk';

import { RecruiterShell } from '../../../components/RecruiterShell';
import { InterviewsBoard } from '../../../components/interviews/InterviewsBoard';
import { businessDays, zonedToIso, type Interview } from '../../../lib/interviews/interviews';
import { jobIdsToLookUp, toAgendaRows } from '../../../lib/interviews/live';
import {
  FINAL_ROUND,
  representativeAttendees,
  representativeInterviews,
  representativeScorecard,
} from '../../../lib/interviews/representative';
import { readRecruiterConfig, type RecruiterConfig } from '../../../lib/recruiter-config';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';

/** This week's real interviews, or null when application-service can't be reached. */
async function loadAgenda(cfg: RecruiterConfig): Promise<Interview[] | null> {
  if (!cfg.applicationServiceUrl) return null;
  try {
    const apps = createJobocateClient({
      baseUrl: cfg.applicationServiceUrl,
      getTenantId: () => cfg.tenantId,
    });
    const rows = await apps.interviews.upcoming({ limit: 100 });
    const titles = new Map<string, string>();
    if (cfg.jobServiceUrl) {
      const jobs = createJobocateClient({
        baseUrl: cfg.jobServiceUrl,
        getTenantId: () => cfg.tenantId,
      });
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

export default async function InterviewsPage() {
  // Calendars and the scorecard form are not connected yet, so the time finder and the scorecard
  // stay labelled samples. The week agenda is real whenever application-service answers.
  const cfg = readRecruiterConfig();
  const now = new Date();
  const days = businessDays(now, FIRM_TIME_ZONE, 5);
  const live = await loadAgenda(cfg);
  return (
    <RecruiterShell
      hideNewJob
      title="Interviews"
      subtitle="The agent finds times that suit the panel and the candidate. You confirm every first invite."
    >
      <InterviewsBoard
        days={days}
        attendees={representativeAttendees(days)}
        meeting={FINAL_ROUND}
        interviews={
          live ??
          representativeInterviews(days, (d, t) => zonedToIso(d, t, FIRM_TIME_ZONE), now)
        }
        scorecard={representativeScorecard(now)}
        now={now.toISOString()}
        timeZone={FIRM_TIME_ZONE}
        representative
        liveAgenda={live !== null}
      />
    </RecruiterShell>
  );
}
