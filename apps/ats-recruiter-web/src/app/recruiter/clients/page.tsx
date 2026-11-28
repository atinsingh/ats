import { RecruiterShell } from '../../../components/RecruiterShell';
import { ClientsBoard } from '../../../components/clients/ClientsBoard';
import type { Client } from '../../../lib/clients/clients';
import { toClientRows } from '../../../lib/clients/live';
import { representativeClients } from '../../../lib/clients/representative';
import { REVENUE_NOTE, revenueByClient } from '../../../lib/clients/revenue';
import { localDay } from '../../../lib/interviews/interviews';
import { readRecruiterConfig, type RecruiterConfig } from '../../../lib/recruiter-config';
import { recruiterClient } from '../../../lib/submittals/names';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';

/** Estimated revenue per client from placements, or undefined when they can't be loaded. */
async function loadRevenue(cfg: RecruiterConfig, today: string) {
  if (!cfg.applicationServiceUrl) return undefined;
  try {
    const rows = await recruiterClient(cfg, cfg.applicationServiceUrl).placements.list(500);
    return revenueByClient(rows, today);
  } catch {
    return undefined;
  }
}

/** The tenant's real clients, or null when job-service can't be reached. */
async function loadClients(cfg: RecruiterConfig, revenue: Map<string, number> | undefined) {
  if (!cfg.jobServiceUrl) return null;
  try {
    const rows = await recruiterClient(cfg, cfg.jobServiceUrl).clients.list({ limit: 500 });
    return toClientRows(rows, cfg.recruiterUserId, revenue) satisfies Client[];
  } catch {
    return null;
  }
}

export default async function ClientsPage() {
  // Real clients whenever job-service answers. Revenue is estimated from placements; it shows
  // "Not tracked" when placements can't be loaded. If job-service is down, the page falls back to
  // labelled representative data.
  const cfg = readRecruiterConfig();
  const now = new Date();
  const revenue = await loadRevenue(cfg, localDay(now, FIRM_TIME_ZONE));
  const live = await loadClients(cfg, revenue);
  return (
    <RecruiterShell
      hideNewJob
      title="Clients"
      subtitle="Every company you place with or are pitching. Clients that need a call come first."
    >
      <ClientsBoard
        clients={live ?? representativeClients(now)}
        now={now.toISOString()}
        representative={live === null}
        revenueNote={live !== null && revenue ? REVENUE_NOTE : undefined}
      />
    </RecruiterShell>
  );
}
