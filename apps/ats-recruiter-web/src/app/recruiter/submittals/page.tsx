import { RecruiterShell } from '../../../components/RecruiterShell';
import { SubmittalsBoard } from '../../../components/submittals/SubmittalsBoard';
import { representativeSubmittals } from '../../../lib/submittals/representative';

export const dynamic = 'force-dynamic';

export default function SubmittalsPage() {
  // No submittal service exists yet (IATS-163 is screens first), so the list runs on labelled
  // representative data. Swap this for the service client when it lands.
  const now = new Date();
  return (
    <RecruiterShell
      hideNewJob
      title="Submittals"
      subtitle="Everyone you have put forward, by client and status. A client silent for more than 3 business days is flagged for a follow-up."
    >
      <SubmittalsBoard
        submittals={representativeSubmittals(now)}
        now={now.toISOString()}
        representative
      />
    </RecruiterShell>
  );
}
