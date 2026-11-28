import { RecruiterShell } from '../../../components/RecruiterShell';
import { SourcingBoard } from '../../../components/sourcing/SourcingBoard';
import { representativeTargets } from '../../../lib/sourcing/representative';

export const dynamic = 'force-dynamic';

export default function SourcingPage() {
  // The sourcing agent and a job-posting feed are not connected yet (IATS-165 is screens first),
  // so targets are labelled representative data. Swap this for the agent's output when it lands.
  return (
    <RecruiterShell
      hideNewJob
      title="Client sourcing"
      subtitle="Companies hiring for skills your bench already has. The agent finds them and drafts the intro; you decide what goes out."
    >
      <SourcingBoard
        targets={representativeTargets()}
        now={new Date().toISOString()}
        representative
      />
    </RecruiterShell>
  );
}
