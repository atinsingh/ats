import Link from 'next/link';
import {
  JobocateHttpError,
  createJobocateClient,
  type SavedJob,
} from '@jobocate/api-sdk';
import { readPortalServerConfig } from '../../../lib/portal-config';
import {
  ConfigMissingNotice,
  EmptyState,
  ErrorBanner,
} from '../../../components/portal/ConfigMissingNotice';

export const dynamic = 'force-dynamic';

export default async function SavedJobsPage() {
  const cfg = readPortalServerConfig();
  if (!cfg.candidateServiceUrl) {
    return (
      <ConfigMissingNotice
        envName="NEXT_PUBLIC_CANDIDATE_SERVICE_URL"
        example="http://localhost:8083"
      />
    );
  }
  const client = createJobocateClient({
    baseUrl: cfg.candidateServiceUrl,
    getTenantId: () => cfg.tenantId,
  });

  let saved: SavedJob[] = [];
  let error: string | null = null;
  try {
    saved = await client.savedJobs.mine();
  } catch (e) {
    if (e instanceof JobocateHttpError && e.status === 404) {
      saved = [];
    } else {
      error = e instanceof Error ? e.message : 'Failed to load saved jobs';
    }
  }

  if (error) return <ErrorBanner message={error} />;

  if (saved.length === 0) {
    return (
      <EmptyState
        title="No saved jobs yet"
        hint="Tap “Save” on a job listing to bookmark it for later."
        cta={
          <Link
            href="/jobs"
            className="rounded-full bg-jobocate-coral px-5 py-2 text-sm font-semibold text-white hover:bg-jobocate-coralHover"
          >
            Browse jobs
          </Link>
        }
      />
    );
  }

  return (
    <ul className="space-y-3" role="list">
      {saved.map((s) => (
        <li
          key={s.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div>
            <Link
              href={`/jobs/${s.jobId}`}
              className="font-medium text-slate-900 hover:text-jobocate-coral"
            >
              {s.jobTitle ?? 'Untitled role'}
            </Link>
            {s.companyName ? (
              <p className="text-xs text-jobocate-muted">{s.companyName}</p>
            ) : null}
            <p className="mt-1 text-xs text-jobocate-muted">
              Saved {new Date(s.savedAt).toLocaleDateString()}
            </p>
          </div>
          <Link
            href={`/jobs/${s.jobId}`}
            className="rounded-full bg-jobocate-coral px-4 py-1.5 text-sm font-semibold text-white hover:bg-jobocate-coralHover"
          >
            View role
          </Link>
        </li>
      ))}
    </ul>
  );
}
