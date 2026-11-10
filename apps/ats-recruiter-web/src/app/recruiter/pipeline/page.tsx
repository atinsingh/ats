import Link from 'next/link';
import { RecruiterShell } from '../../../components/RecruiterShell';

export const dynamic = 'force-dynamic';

export default function PipelinePage() {
  return (
    <RecruiterShell
      title="Pipeline"
      subtitle="Per-job pipelines live under each job. The tenant-wide default lives here."
    >
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
        <p className="text-base font-semibold text-slate-800">Default pipeline</p>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Tenant-wide pipeline editing arrives with the pipeline-service. Until then, each job has
          a default pipeline based on the canonical application states (APPLIED → SCREENING →
          SHORTLISTED → INTERVIEWED → OFFERED → HIRED).
        </p>
        <Link
          href="/recruiter/jobs"
          className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Back to jobs
        </Link>
      </div>
    </RecruiterShell>
  );
}
