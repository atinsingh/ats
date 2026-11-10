import { readPortalServerConfig } from '../../../../lib/portal-config';
import { ConfigMissingNotice } from '../../../../components/portal/ConfigMissingNotice';
import { UploadForm } from './upload-form';

export const dynamic = 'force-dynamic';

export default async function ResumeUploadPage() {
  const cfg = readPortalServerConfig();
  if (!cfg.candidateServiceUrl) {
    return (
      <ConfigMissingNotice
        envName="NEXT_PUBLIC_CANDIDATE_SERVICE_URL"
        example="http://localhost:8083"
      />
    );
  }
  return (
    <section aria-label="Upload resume" className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Upload a resume</h2>
        <p className="mt-1 text-sm text-jobocate-muted">
          PDF, DOC or DOCX up to 10 MB. We'll parse it automatically and let you review the
          extracted fields before they update your profile.
        </p>
      </header>
      <UploadForm
        baseUrl={cfg.candidateServiceUrl}
        tenantId={cfg.tenantId}
        candidateId={cfg.candidateUserId}
      />
    </section>
  );
}
