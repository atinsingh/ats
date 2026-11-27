import { createJobocateClient } from '@jobocate/api-sdk';

import { RecruiterShell } from '../../../components/RecruiterShell';
import { LiveReviewQueue } from '../../../components/review/LiveReviewQueue';
import { ReviewQueue } from '../../../components/review/ReviewQueue';
import { readRecruiterConfig } from '../../../lib/recruiter-config';
import { artifactToProposal } from '../../../lib/review/artifacts';
import type { Proposal } from '../../../lib/review/queue';
import { representativeProposals } from '../../../lib/review/representative';

export const dynamic = 'force-dynamic';

const QUEUE_LIMIT = 100;

/** Real AI drafts when application-service answers; otherwise null and the page uses samples. */
async function loadLiveProposals(baseUrl: string, tenantId: string): Promise<Proposal[] | null> {
  try {
    const client = createJobocateClient({ baseUrl, getTenantId: () => tenantId });
    const artifacts = await client.aiArtifacts.reviewQueue(QUEUE_LIMIT);
    const now = new Date();
    return artifacts.map((a) => artifactToProposal(a, now));
  } catch {
    return null;
  }
}

export default async function ReviewPage() {
  const cfg = readRecruiterConfig();
  const live = cfg.applicationServiceUrl
    ? await loadLiveProposals(cfg.applicationServiceUrl, cfg.tenantId)
    : null;
  return (
    <RecruiterShell
      hideNewJob
      title="Review queue"
      subtitle="Nothing reaches a candidate, client or portal until you approve it."
    >
      {live && cfg.applicationServiceUrl ? (
        <LiveReviewQueue
          proposals={live}
          apiBase={cfg.applicationServiceUrl}
          tenantId={cfg.tenantId}
          userId={cfg.recruiterUserId}
        />
      ) : (
        // Submittals, messages, job posts and timesheets have no approvals service yet, so
        // without application-service the queue runs on labelled representative data.
        <ReviewQueue proposals={representativeProposals()} representative />
      )}
    </RecruiterShell>
  );
}
