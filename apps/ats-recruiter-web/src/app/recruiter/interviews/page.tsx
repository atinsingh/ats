import { RecruiterShell } from '../../../components/RecruiterShell';
import { InterviewsBoard } from '../../../components/interviews/InterviewsBoard';
import { businessDays, zonedToIso } from '../../../lib/interviews/interviews';
import {
  FINAL_ROUND,
  representativeAttendees,
  representativeInterviews,
  representativeScorecard,
} from '../../../lib/interviews/representative';
import { loadAgenda } from '../../../lib/live/loaders';
import { readRecruiterConfig } from '../../../lib/recruiter-config';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';

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
