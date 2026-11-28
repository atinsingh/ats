import { RecruiterShell } from '../../../components/RecruiterShell';
import { TalentSearchBoard } from '../../../components/talent/TalentSearchBoard';
import {
  representativeSavedSearches,
  representativeTalentJobs,
} from '../../../lib/talent/representative';

export const dynamic = 'force-dynamic';

export default function TalentSearchPage() {
  // Candidate search on OpenSearch is not wired to this page yet (IATS-172 is screens first), so
  // jobs and matches are labelled representative data.
  return (
    <RecruiterShell
      hideNewJob
      title="Talent search"
      subtitle="Search strings written from the job's must-haves, one per source. Your own database runs first: most placements come from people a firm already knows."
    >
      <TalentSearchBoard
        jobs={representativeTalentJobs()}
        saved={representativeSavedSearches()}
        representative
      />
    </RecruiterShell>
  );
}
