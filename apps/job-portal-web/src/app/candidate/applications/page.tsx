import Link from 'next/link';
import {
  JobocateHttpError,
  createJobocateClient,
  type ApplicationSummary,
} from '@jobocate/api-sdk';
import { readPortalServerConfig } from '../../../lib/portal-config';
import {
  ConfigMissingNotice,
  EmptyState,
  ErrorBanner,
} from '../../../components/portal/ConfigMissingNotice';

export const dynamic = 'force-dynamic';

const STATUS_PALETTE: Record<string, string> = {
  APPLIED: 'bg-blue-50 text-blue-800',
  SCREENING: 'bg-indigo-50 text-indigo-800',
  SHORTLISTED: 'bg-violet-50 text-violet-800',
  INTERVIEW_SCHEDULED: 'bg-amber-50 text-amber-800',
  INTERVIEWED: 'bg-amber-100 text-amber-900',
  OFFERED: 'bg-emerald-50 text-emerald-800',
  HIRED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-rose-50 text-rose-800',
  WITHDRAWN: 'bg-slate-100 text-slate-700',
  EXPIRED: 'bg-slate-100 text-slate-700',
};

export default async function ApplicationsPage() {
  const cfg = readPortalServerConfig();
  if (!cfg.candidateServiceUrl && !cfg.applicationServiceUrl) {
    return (
      <ConfigMissingNotice
        envName="NEXT_PUBLIC_API_BASE_URL"
        example="http://localhost:8084"
      />
    );
  }

  const client = createJobocateClient({
    baseUrl: cfg.candidateServiceUrl ?? cfg.applicationServiceUrl ?? '',
    getTenantId: () => cfg.tenantId,
  });

  let applications: ApplicationSummary[] = [];
  let error: string | null = null;
  try {
    applications = await client.applications.mine();
  } catch (e) {
    if (e instanceof JobocateHttpError && e.status === 404) {
      applications = [];
    } else {
      error = e instanceof Error ? e.message : 'Failed to load applications';
    }
  }

  if (error) return <ErrorBanner message={error} />;

  if (applications.length === 0) {
    return (
      <EmptyState
        title="You haven't applied yet"
        hint="Browse jobs and submit an application to start tracking your progress here."
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
    <section aria-label="Applications">
      <ul className="space-y-3" role="list">
        {applications.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div>
              <Link
                href={`/jobs/${a.jobId}`}
                className="font-medium text-slate-900 hover:text-jobocate-coral"
              >
                {a.jobTitle ?? 'Untitled role'}
              </Link>
              {a.companyName ? (
                <p className="text-xs text-jobocate-muted">{a.companyName}</p>
              ) : null}
              <p className="mt-1 text-xs text-jobocate-muted">
                Applied {formatDate(a.appliedAt)}
                {a.updatedAt ? ` · updated ${formatDate(a.updatedAt)}` : ''}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                STATUS_PALETTE[a.status] ?? 'bg-slate-100 text-slate-700'
              }`}
            >
              {a.status.replace('_', ' ').toLowerCase()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}
