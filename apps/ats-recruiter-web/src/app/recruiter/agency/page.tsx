import { AgencyBoard } from '../../../components/agency/AgencyBoard';
import { RecruiterShell } from '../../../components/RecruiterShell';
import {
  representativeDesks,
  representativeManagerItems,
  representativePolicy,
} from '../../../lib/agency/representative';
import { localDay } from '../../../lib/interviews/interviews';
import { addDays } from '../../../lib/sequences/sequences';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';

export default function AgencyPage() {
  // Desk metrics and manager roles are not connected yet (IATS-176 is screens first), so the
  // desks are labelled representative data. The page only reads and links.
  const today = localDay(new Date(), FIRM_TIME_ZONE);

  return (
    <RecruiterShell
      hideNewJob
      title="Agency view"
      subtitle="The firm's view across desks this week: how each desk is doing, the AI policy every desk works inside, and what needs a manager."
    >
      <AgencyBoard
        desks={representativeDesks()}
        policy={representativePolicy()}
        items={representativeManagerItems((n) => addDays(today, n))}
        today={today}
        representative
      />
    </RecruiterShell>
  );
}
