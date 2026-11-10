import Link from 'next/link';
import {
  JobocateHttpError,
  createJobocateClient,
  type Job,
} from '@jobocate/api-sdk';
import {
  EmptyState,
  ErrorBanner,
  MissingConfig,
  RecruiterShell,
  StatusPill,
} from '../../../components/RecruiterShell';
import { readRecruiterConfig } from '../../../lib/recruiter-config';

type SP = { status?: string };

export const dynamic = 'force-dynamic';

export default async function JobsListPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const cfg = readRecruiterConfig();
  if (!cfg.jobServiceUrl) {
    return (
      <RecruiterShell title="Jobs">
        <MissingConfig envName="NEXT_PUBLIC_JOB_SERVICE_URL" example="http://localhost:8082" />
      </RecruiterShell>
    );
  }

  const client = createJobocateClient({
    baseUrl: cfg.jobServiceUrl,
    getTenantId: () => cfg.tenantId,
  });

  let jobs: Job[] = [];
  let error: string | null = null;
  try {
    jobs = await client.jobs.listForRecruiter({
      status: (sp.status as Job['status']) || undefined,
      limit: 50,
    });
  } catch (e) {
    if (e instanceof JobocateHttpError && e.status === 404) {
      jobs = [];
    } else {
      error = e instanceof Error ? e.message : 'Failed to load jobs';
    }
  }

  return (
    <RecruiterShell
      title="Jobs"
      subtitle="All jobs in your tenant."
      actions={
        <Link
          href="/recruiter/jobs/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          + New job
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusFilterChip current={sp.status} value="" label="All" />
        <StatusFilterChip current={sp.status} value="DRAFT" label="Draft" />
        <StatusFilterChip current={sp.status} value="PUBLISHED" label="Published" />
        <StatusFilterChip current={sp.status} value="CLOSED" label="Closed" />
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      {jobs.length === 0 && !error ? (
        <EmptyState
          title="No jobs yet"
          hint="Create your first job to start receiving applications."
          cta={
            <Link
              href="/recruiter/jobs/new"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              + New job
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Employment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/recruiter/jobs/${j.id}`}
                      className="font-medium text-slate-900 hover:text-slate-700"
                    >
                      {j.title}
                    </Link>
                    {j.department ? (
                      <p className="text-xs text-slate-500">{j.department}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {j.location ?? composeLocation(j) ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{j.employmentType ?? '—'}</td>
                  <td className="px-4 py-3"><StatusPill status={j.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/recruiter/jobs/${j.id}/applications`}
                      className="text-sm font-medium text-slate-700 hover:underline"
                    >
                      Applicants →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RecruiterShell>
  );
}

function StatusFilterChip({
  current,
  value,
  label,
}: {
  current?: string;
  value: string;
  label: string;
}) {
  const isActive = (current ?? '') === value;
  const href = value ? `/recruiter/jobs?status=${value}` : '/recruiter/jobs';
  return (
    <Link
      href={href}
      className={
        isActive
          ? 'rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white'
          : 'rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50'
      }
    >
      {label}
    </Link>
  );
}

function composeLocation(j: Job): string | null {
  const parts = [j.locationCity, j.locationRegion, j.locationCountry].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}
