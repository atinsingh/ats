import { ActivityLogBoard } from '../../../components/activity/ActivityLogBoard';
import { RecruiterShell } from '../../../components/RecruiterShell';
import { representativeActivity } from '../../../lib/activity/representative';
import { localDay, zonedToIso } from '../../../lib/interviews/interviews';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';

export default function ActivityPage() {
  // The audit service is not connected yet (IATS-175 is screens first), so events are labelled
  // representative data. The page only reads; it never edits or deletes an event.
  const now = new Date();
  const today = localDay(now, FIRM_TIME_ZONE);
  const at = (daysAgo: number, time: string) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    const iso = zonedToIso(d.toISOString().slice(0, 10), time, FIRM_TIME_ZONE);
    return iso > now.toISOString() ? now.toISOString() : iso;
  };

  return (
    <RecruiterShell
      hideNewJob
      title="Activity log"
      subtitle="Every action by people, agents and the system, newest first. Overrides show the reason given, and agent actions show who approved them."
    >
      <ActivityLogBoard
        events={representativeActivity(at)}
        now={now.toISOString()}
        timeZone={FIRM_TIME_ZONE}
        representative
      />
    </RecruiterShell>
  );
}
