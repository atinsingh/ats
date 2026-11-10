import Link from 'next/link';
import { ApplyForm } from './apply-form';
import { readPortalServerConfig } from '../../../../lib/portal-config';
import { ConfigMissingNotice } from '../../../../components/portal/ConfigMissingNotice';

export const dynamic = 'force-dynamic';

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cfg = readPortalServerConfig();
  const apiBase = cfg.applicationServiceUrl ?? cfg.candidateServiceUrl;

  return (
    <div className="min-h-dvh bg-landing-gradient text-jobocate-ink">
      <header className="border-b border-rose-100/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-jobocate-coral">
            JOBOCATE
          </Link>
          <Link href={`/jobs/${id}`} className="text-sm text-jobocate-coral hover:underline">
            ← Back to role
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Apply</h1>
        <p className="mt-2 text-sm text-jobocate-muted">
          Pick your resume, add a quick note, and submit. You can withdraw any time before
          interviews start.
        </p>

        {!apiBase ? (
          <div className="mt-6">
            <ConfigMissingNotice
              envName="NEXT_PUBLIC_APPLICATION_SERVICE_URL"
              example="http://localhost:8084"
            />
          </div>
        ) : (
          <ApplyForm
            jobId={id}
            apiBase={apiBase}
            resumesApiBase={cfg.candidateServiceUrl ?? apiBase}
            tenantId={cfg.tenantId}
            candidateId={cfg.candidateUserId}
          />
        )}
      </main>
    </div>
  );
}
