import { RecruiterShell } from '../../../components/RecruiterShell';
import { LiveReviewQueue } from '../../../components/review/LiveReviewQueue';
import { ReviewQueue } from '../../../components/review/ReviewQueue';
import { loadLiveProposals } from '../../../lib/live/loaders';
import { readRecruiterConfig } from '../../../lib/recruiter-config';
import { representativeProposals } from '../../../lib/review/representative';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const cfg = readRecruiterConfig();
  const live = await loadLiveProposals(cfg);
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
        // Messages, job posts and timesheets have no approvals service yet, so without
        // application-service the queue runs on labelled representative data.
        <ReviewQueue proposals={representativeProposals()} representative />
      )}
    </RecruiterShell>
  );
}
