import { RecruiterShell } from '../../../components/RecruiterShell';
import { ReviewQueue } from '../../../components/review/ReviewQueue';
import { representativeProposals } from '../../../lib/review/representative';

export const dynamic = 'force-dynamic';

export default function ReviewPage() {
  // The approvals service does not exist yet (IATS-160 is screens first), so the queue runs on
  // labelled representative data. Swap this for the service client when it lands.
  const proposals = representativeProposals();
  return (
    <RecruiterShell
      hideNewJob
      title="Review queue"
      subtitle="Nothing reaches a candidate, client or portal until you approve it."
    >
      <ReviewQueue proposals={proposals} representative />
    </RecruiterShell>
  );
}
