import { RecruiterShell } from '../../../components/RecruiterShell';
import { InterviewsBoard } from '../../../components/interviews/InterviewsBoard';
import { businessDays, zonedToIso } from '../../../lib/interviews/interviews';
import {
  FINAL_ROUND,
  representativeAttendees,
  representativeInterviews,
  representativeScorecard,
} from '../../../lib/interviews/representative';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';

export default function InterviewsPage() {
  // application-service stores interviews but has no API for them yet, and calendars are not
  // connected (IATS-167 is screens first), so this runs on labelled representative data.
  const now = new Date();
  const days = businessDays(now, FIRM_TIME_ZONE, 5);
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
        interviews={representativeInterviews(days, (d, t) => zonedToIso(d, t, FIRM_TIME_ZONE), now)}
        scorecard={representativeScorecard(now)}
        now={now.toISOString()}
        timeZone={FIRM_TIME_ZONE}
        representative
      />
    </RecruiterShell>
  );
}
