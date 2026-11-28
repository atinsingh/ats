import { createJobocateClient, type CandidateSummary } from '@jobocate/api-sdk';

import { CandidateList } from '../../../components/candidates/CandidateList';
import {
  EmptyState,
  ErrorBanner,
  MissingConfig,
  RecruiterShell,
} from '../../../components/RecruiterShell';
import { readRecruiterConfig } from '../../../lib/recruiter-config';

export const dynamic = 'force-dynamic';

export default async function CandidatesPage() {
  const cfg = readRecruiterConfig();
  const title = 'Candidates';
  const subtitle = 'Everyone in your firm’s talent database.';
  if (!cfg.candidateServiceUrl) {
    return (
      <RecruiterShell title={title} subtitle={subtitle}>
        <MissingConfig
          envName="NEXT_PUBLIC_CANDIDATE_SERVICE_URL"
          example="http://localhost:8083"
        />
      </RecruiterShell>
    );
  }

  // Tenant comes from server config (later the session), never from the browser.
  const client = createJobocateClient({
    baseUrl: cfg.candidateServiceUrl,
    getTenantId: () => cfg.tenantId,
  });

  let candidates: CandidateSummary[] = [];
  let error: string | null = null;
  try {
    candidates = await client.recruiterCandidates.list();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Could not load candidates';
  }

  return (
    <RecruiterShell title={title} subtitle={subtitle}>
      {error ? (
        <ErrorBanner message={`Could not load candidates: ${error}`} />
      ) : candidates.length === 0 ? (
        <EmptyState
          title="No candidates yet"
          hint="Candidates appear here when they apply to a job or you import them."
        />
      ) : (
        <CandidateList candidates={candidates} />
      )}
    </RecruiterShell>
  );
}
