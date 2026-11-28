import { RecruiterShell } from '../../../components/RecruiterShell';
import { SubmittalsBoard } from '../../../components/submittals/SubmittalsBoard';
import { loadSubmittals } from '../../../lib/live/loaders';
import { readRecruiterConfig } from '../../../lib/recruiter-config';
import { representativeSubmittals } from '../../../lib/submittals/representative';

export const dynamic = 'force-dynamic';

export default async function SubmittalsPage() {
  // Real submittals whenever application-service answers, with names looked up from the
  // candidate and job services. Otherwise the page falls back to labelled representative data.
  const cfg = readRecruiterConfig();
  const now = new Date();
  const live = await loadSubmittals(cfg);
  return (
    <RecruiterShell
      hideNewJob
      title="Submittals"
      subtitle="Everyone you have put forward, by client and status. A client silent for more than 3 business days is flagged for a follow-up."
    >
      <SubmittalsBoard
        submittals={live ?? representativeSubmittals(now)}
        now={now.toISOString()}
        representative={live === null}
      />
    </RecruiterShell>
  );
}
