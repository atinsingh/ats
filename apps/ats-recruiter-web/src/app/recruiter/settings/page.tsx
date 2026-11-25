import { RecruiterShell } from '../../../components/RecruiterShell';
import { SettingsBoard } from '../../../components/agents/SettingsBoard';
import { localDay } from '../../../lib/interviews/interviews';
import { MARGIN_FLOOR } from '../../../lib/placements/placements';
import {
  FIRM_SENDING_MAX,
  representativeColleagues,
  representativeConnections,
  representativeEnabled,
  representativeMailboxes,
  representativePolicy,
} from '../../../lib/agents/representative';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';

export default function SettingsPage() {
  // No connections or firm settings API exists yet (IATS-170 is screens first), so everything here
  // is labelled representative data and Save stores nothing.
  const now = new Date();
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

  return (
    <RecruiterShell
      hideNewJob
      title="Settings and connections"
      subtitle="Where agents can work on your behalf, and what still needs your approval."
    >
      <SettingsBoard
        connections={representativeConnections(ago)}
        policy={representativePolicy()}
        enabled={representativeEnabled()}
        mailboxes={representativeMailboxes()}
        colleagues={representativeColleagues()}
        firmSendingMax={FIRM_SENDING_MAX}
        marginFloor={MARGIN_FLOOR}
        now={now.toISOString()}
        today={localDay(now, FIRM_TIME_ZONE)}
        timeZone={FIRM_TIME_ZONE}
        representative
      />
    </RecruiterShell>
  );
}
