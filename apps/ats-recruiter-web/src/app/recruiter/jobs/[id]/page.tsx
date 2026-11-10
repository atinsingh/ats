import Link from 'next/link';
import {
  JobocateHttpError,
  createJobocateClient,
  type Job,
} from '@jobocate/api-sdk';
import {
  ErrorBanner,
  MissingConfig,
  RecruiterShell,
  StatusPill,
} from '../../../../components/RecruiterShell';
import { readRecruiterConfig } from '../../../../lib/recruiter-config';
import { JobActions } from './job-actions';

export const dynamic = 'force-dynamic';

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ publishError?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const cfg = readRecruiterConfig();

  if (!cfg.jobServiceUrl) {
    return (
      <RecruiterShell title="Job">
        <MissingConfig envName="NEXT_PUBLIC_JOB_SERVICE_URL" example="http://localhost:8082" />
      </RecruiterShell>
    );
  }

  const client = createJobocateClient({
    baseUrl: cfg.jobServiceUrl,
    getTenantId: () => cfg.tenantId,
  });

  let job: Job | null = null;
  let error: string | null = null;
  try {
    job = await client.jobs.get(id);
  } catch (e) {
    if (e instanceof JobocateHttpError && e.status === 404) {
      return (
        <RecruiterShell title="Job not found">
          <Link href="/recruiter/jobs" className="text-sm text-slate-700 hover:underline">
            ← Back to jobs
          </Link>
        </RecruiterShell>
      );
    }
    error = e instanceof Error ? e.message : 'Failed to load job';
  }

  if (error || !job) {
    return (
      <RecruiterShell title="Job">
        <ErrorBanner message={error ?? 'Failed to load job'} />
      </RecruiterShell>
    );
  }

  return (
    <RecruiterShell
      title={job.title}
      subtitle={[job.department, composeLocation(job)].filter(Boolean).join(' · ')}
      actions={
        <>
          <Link
            href={`/recruiter/jobs/${job.id}/applications`}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            View applicants
          </Link>
          <StatusPill status={job.status} />
        </>
      }
    >
      {sp.publishError ? (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Job saved as draft. Publishing failed — make sure title, description, and employment type are filled in.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="About">{job.description ?? <Empty />}</Section>
          <Section title="Responsibilities">{job.responsibilities ?? <Empty />}</Section>
          <Section title="Qualifications">{job.qualifications ?? <Empty />}</Section>
          {job.skills && job.skills.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">Skills</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {job.skills.map((s) => (
                  <li
                    key={s}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">Details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Status" value={<StatusPill status={job.status} />} />
              <Row label="Employment" value={job.employmentType ?? '—'} />
              <Row label="Remote" value={job.remotePolicy ?? '—'} />
              <Row
                label="Salary"
                value={
                  job.salaryMinCents && job.salaryMaxCents
                    ? `${(job.salaryMinCents / 100).toLocaleString()} – ${(job.salaryMaxCents / 100).toLocaleString()} ${job.currencyCode ?? ''}`
                    : '—'
                }
              />
              <Row
                label="Experience"
                value={
                  job.experienceMinYears != null
                    ? `${job.experienceMinYears}–${job.experienceMaxYears ?? '?'} years`
                    : '—'
                }
              />
              <Row label="Slug" value={job.slug ?? '—'} />
              <Row
                label="Published"
                value={job.publishedAt ? new Date(job.publishedAt).toLocaleDateString() : '—'}
              />
            </dl>
          </div>
          <JobActions
            apiBase={cfg.jobServiceUrl}
            tenantId={cfg.tenantId}
            jobId={job.id}
            status={job.status}
          />
        </aside>
      </div>
    </RecruiterShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

function Empty() {
  return <span className="text-slate-400">Not provided</span>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function composeLocation(j: Job): string {
  return [j.locationCity, j.locationRegion, j.locationCountry].filter(Boolean).join(', ');
}
