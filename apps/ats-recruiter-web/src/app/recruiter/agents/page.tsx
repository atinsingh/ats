import { RecruiterShell } from '../../../components/RecruiterShell';
import { AgentsBoard } from '../../../components/agents/AgentsBoard';
import { localDay, zonedToIso } from '../../../lib/interviews/interviews';
import {
  representativeAgents,
  representativeEnabled,
  representativePolicy,
  representativeRuns,
} from '../../../lib/agents/representative';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';

export default function AgentsPage() {
  // No agent run log or firm settings API exists yet (IATS-170 is screens first), so agents, runs
  // and policy are labelled representative data.
  const now = new Date();
  const today = localDay(now, FIRM_TIME_ZONE);
  const at = (daysAgo: number, time: string) => {
    const day = new Date(`${today}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() - daysAgo);
    const iso = zonedToIso(day.toISOString().slice(0, 10), time, FIRM_TIME_ZONE);
    // A run scheduled later today has not happened yet; show it as just finished.
    return iso > now.toISOString() ? now.toISOString() : iso;
  };

  return (
    <RecruiterShell
      hideNewJob
      title="Agents"
      subtitle="Eight agents work your desk. Each drafts and proposes; you approve. They can only go as far as your firm's AI policy allows."
    >
      <AgentsBoard
        agents={representativeAgents()}
        runs={representativeRuns(at)}
        policy={representativePolicy()}
        enabled={representativeEnabled()}
        now={now.toISOString()}
        timeZone={FIRM_TIME_ZONE}
        representative
      />
    </RecruiterShell>
  );
}
