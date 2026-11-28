import { RecruiterShell } from '../../../components/RecruiterShell';
import { InboxBoard } from '../../../components/inbox/InboxBoard';
import { representativeInbox } from '../../../lib/inbox/representative';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist; used so server and client agree. */
const FIRM_TIME_ZONE = 'America/Toronto';

export default function InboxPage() {
  // No mailbox or SMS integration exists yet (IATS-166 is screens first), so conversations are
  // labelled representative data. Swap this for the messaging service when it lands.
  const now = new Date();
  return (
    <RecruiterShell
      hideNewJob
      title="Inbox"
      subtitle="Email, SMS and VMS alerts, linked to the right person and job. LinkedIn messages stay in LinkedIn."
    >
      <InboxBoard
        conversations={representativeInbox(now)}
        now={now.toISOString()}
        timeZone={FIRM_TIME_ZONE}
        representative
      />
    </RecruiterShell>
  );
}
