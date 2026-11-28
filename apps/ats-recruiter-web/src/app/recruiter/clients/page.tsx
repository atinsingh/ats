import { createJobocateClient } from '@jobocate/api-sdk';

import { RecruiterShell } from '../../../components/RecruiterShell';
import { ClientsBoard } from '../../../components/clients/ClientsBoard';
import type { Client } from '../../../lib/clients/clients';
import { toClientRows } from '../../../lib/clients/live';
import { representativeClients } from '../../../lib/clients/representative';
import { readRecruiterConfig, type RecruiterConfig } from '../../../lib/recruiter-config';

export const dynamic = 'force-dynamic';

/** The tenant's real clients, or null when job-service can't be reached. */
async function loadClients(cfg: RecruiterConfig): Promise<Client[] | null> {
  if (!cfg.jobServiceUrl) return null;
  try {
    const api = createJobocateClient({
      baseUrl: cfg.jobServiceUrl,
      getTenantId: () => cfg.tenantId,
      getUserId: () => cfg.recruiterUserId,
    });
    return toClientRows(await api.clients.list({ limit: 500 }), cfg.recruiterUserId);
  } catch {
    return null;
  }
}

export default async function ClientsPage() {
  // Real clients whenever job-service answers. Revenue shows "Not tracked" until placements
  // exist. If the service is down, the page falls back to labelled representative data.
  const cfg = readRecruiterConfig();
  const now = new Date();
  const live = await loadClients(cfg);
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
      />
    </RecruiterShell>
  );
}
