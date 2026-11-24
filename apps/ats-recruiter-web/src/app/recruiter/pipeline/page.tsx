import Link from 'next/link';
import { RecruiterShell } from '../../../components/RecruiterShell';

export const dynamic = 'force-dynamic';

export default function PipelinePage() {
  return (
    <RecruiterShell
      title="Pipeline"
      subtitle="Per-job pipelines live under each job. The tenant-wide default lives here."
    >
      <div className="rounded-xl border border-dashed border-input bg-card p-10 text-center text-muted-foreground">
        <p className="text-base font-semibold text-foreground">Default pipeline</p>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Tenant-wide pipeline editing arrives with the pipeline-service. Until then, each job has a
          default pipeline based on the canonical application states (APPLIED → SCREENING →
          SHORTLISTED → INTERVIEWED → OFFERED → HIRED).
        </p>
        <Link
          href="/recruiter/jobs"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Back to jobs
        </Link>
      </div>
    </RecruiterShell>
  );
}
