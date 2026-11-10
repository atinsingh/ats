import {
  JobocateHttpError,
  createJobocateClient,
  type AiArtifact,
} from '@jobocate/api-sdk';
import { readPortalServerConfig } from '../../../lib/portal-config';
import {
  ConfigMissingNotice,
  EmptyState,
  ErrorBanner,
} from '../../../components/portal/ConfigMissingNotice';
import { ArtifactCard } from './artifact-card';
import { RequestCoverLetterForm } from './request-cover-letter';

export const dynamic = 'force-dynamic';

export default async function AiToolsPage() {
  const cfg = readPortalServerConfig();
  if (!cfg.applicationServiceUrl) {
    return (
      <ConfigMissingNotice
        envName="NEXT_PUBLIC_APPLICATION_SERVICE_URL"
        example="http://localhost:8084"
      />
    );
  }

  const client = createJobocateClient({
    baseUrl: cfg.applicationServiceUrl,
    getTenantId: () => cfg.tenantId,
  });

  let artifacts: AiArtifact[] = [];
  let error: string | null = null;
  try {
    artifacts = await client.aiArtifacts.listMine(cfg.candidateUserId, 50);
  } catch (e) {
    if (e instanceof JobocateHttpError && e.status === 404) {
      artifacts = [];
    } else {
      error = e instanceof Error ? e.message : 'Failed to load AI artifacts';
    }
  }

  return (
    <section aria-label="AI tools" className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">AI drafts</h2>
        <p className="mt-1 text-sm text-jobocate-muted">
          Drafts are generated for review only. Nothing is sent to a recruiter
          or attached to an application until you press <strong>Approve</strong>.
        </p>
      </header>

      <RequestCoverLetterForm
        applicationServiceUrl={cfg.applicationServiceUrl}
        tenantId={cfg.tenantId}
        candidateUserId={cfg.candidateUserId}
      />

      {error ? <ErrorBanner message={error} /> : null}

      {!error && artifacts.length === 0 ? (
        <EmptyState
          title="No AI drafts yet"
          hint="Request a cover letter or interview prep pack to get started."
        />
      ) : null}

      {!error && artifacts.length > 0 ? (
        <ul className="space-y-3" role="list">
          {artifacts.map((artifact) => (
            <li key={artifact.id}>
              <ArtifactCard
                artifact={artifact}
                applicationServiceUrl={cfg.applicationServiceUrl ?? ''}
                tenantId={cfg.tenantId}
                candidateUserId={cfg.candidateUserId}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
