import { NewJobForm } from './form';
import { MissingConfig, RecruiterShell } from '../../../../components/RecruiterShell';
import { readRecruiterConfig } from '../../../../lib/recruiter-config';

export const dynamic = 'force-dynamic';

export default function NewJobPage() {
  const cfg = readRecruiterConfig();
  return (
    <RecruiterShell title="New job" subtitle="Save as draft, then publish when ready.">
      {cfg.jobServiceUrl ? (
        <NewJobForm apiBase={cfg.jobServiceUrl} tenantId={cfg.tenantId} />
      ) : (
        <MissingConfig envName="NEXT_PUBLIC_JOB_SERVICE_URL" example="http://localhost:8082" />
      )}
    </RecruiterShell>
  );
}
