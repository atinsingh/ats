import { RecruiterShell } from '../../../components/RecruiterShell';
import { ReportsBoard } from '../../../components/reports/ReportsBoard';
import { agentRows, funnelSteps, sourceRows } from '../../../lib/reports/reports';
import {
  representativeAgents,
  representativeFunnel,
  representativeSources,
} from '../../../lib/reports/representative';

export const dynamic = 'force-dynamic';

export default function ReportsPage() {
  // No reporting API exists for the recruiter app yet (IATS-169 is screens first), so the figures
  // are labelled representative data. Swap these for the analytics read model when it lands.
  return (
    <RecruiterShell
      hideNewJob
      title="Reports"
      subtitle="Your desk over the last 90 days: the funnel, where starts came from, and how often you overrule the agents."
    >
      <ReportsBoard
        funnel={funnelSteps(representativeFunnel())}
        sources={sourceRows(representativeSources())}
        agents={agentRows(representativeAgents())}
        representative
      />
    </RecruiterShell>
  );
}
