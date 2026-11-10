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

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cfg = readRecruiterConfig();
  if (!cfg.jobServiceUrl) {
    return (
      <RecruiterShell title="Dashboard">
        <MissingConfig
          envName="NEXT_PUBLIC_JOB_SERVICE_URL"
          example="http://localhost:8082"
        />
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
    jobs = await client.jobs.listForRecruiter({ limit: 25 });
  } catch (e) {
    if (e instanceof JobocateHttpError && e.status === 404) {
      jobs = [];
    } else {
      error = e instanceof Error ? e.message : 'Failed to load jobs';
    }
  }

  const counts = countByStatus(jobs);
  const recent = jobs.slice(0, 5);

  return (
    <RecruiterShell
      title="Dashboard"
      subtitle="Hiring across your tenant — at a glance."
    >
      {error ? <ErrorBanner message={error} /> : null}

      <section
        aria-label="Hiring summary"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard label="Published" value={counts.PUBLISHED ?? 0} />
        <StatCard label="Draft" value={counts.DRAFT ?? 0} />
        <StatCard label="Closed" value={counts.CLOSED ?? 0} />
        <StatCard label="Total" value={jobs.length} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Recent jobs">
          {recent.length === 0 ? (
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
            <ul className="divide-y divide-slate-100" role="list">
              {recent.map((j) => (
                <li key={j.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/recruiter/jobs/${j.id}`}
                      className="font-medium text-slate-900 hover:text-slate-700"
                    >
                      {j.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {j.location ?? composeLocation(j)}
                      {j.employmentType ? ` · ${j.employmentType}` : ''}
                    </p>
                  </div>
                  <StatusPill status={j.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Tips">
          <ul className="space-y-3 text-sm text-slate-700">
            <li>
              <span className="font-medium">Publish thoughtfully:</span> jobs need
              a title, description, and employment type before publishing.
            </li>
            <li>
              <span className="font-medium">Pipelines:</span> assign each job
              to a pipeline so candidates flow through your stages.
            </li>
            <li>
              <span className="font-medium">Close, don&apos;t delete:</span> closing
              keeps history while removing the role from public search.
            </li>
          </ul>
        </Card>
      </section>
    </RecruiterShell>
  );
}

function countByStatus(jobs: Job[]): Record<string, number> {
  return jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1;
    return acc;
  }, {});
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function composeLocation(j: Job): string {
  return [j.locationCity, j.locationRegion, j.locationCountry].filter(Boolean).join(', ');
}
