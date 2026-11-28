import { RecruiterShell } from '../../../components/RecruiterShell';
import { ReportsBoard } from '../../../components/reports/ReportsBoard';
import { readRecruiterConfig, type RecruiterConfig } from '../../../lib/recruiter-config';
import { toReport, type LiveReport } from '../../../lib/reports/live';
import { agentRows, funnelSteps, sourceRows } from '../../../lib/reports/reports';
import {
  representativeAgents,
  representativeFunnel,
  representativeSources,
} from '../../../lib/reports/representative';
import { recruiterClient } from '../../../lib/submittals/names';

export const dynamic = 'force-dynamic';

const DAYS = 90;

/** The tenant's real desk report, or null when application-service can't be reached. */
async function loadReport(cfg: RecruiterConfig): Promise<LiveReport | null> {
  if (!cfg.applicationServiceUrl) return null;
  try {
    return toReport(await recruiterClient(cfg, cfg.applicationServiceUrl).reports.desk(DAYS));
  } catch {
    return null;
  }
}

export default async function ReportsPage() {
  // Real counts whenever application-service answers; otherwise labelled representative data.
  const live = await loadReport(readRecruiterConfig());
  const data = live ?? {
    funnel: representativeFunnel(),
    sources: representativeSources(),
    agents: representativeAgents(),
  };
  return (
    <RecruiterShell
      hideNewJob
      title="Reports"
      subtitle="Your desk over the last 90 days: the funnel, where starts came from, and how often you overrule the agents."
    >
      <ReportsBoard
        funnel={funnelSteps(data.funnel)}
        sources={sourceRows(data.sources)}
        agents={agentRows(data.agents)}
        representative={live === null}
      />
    </RecruiterShell>
  );
}
