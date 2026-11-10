import Link from 'next/link';
import { JobocateHttpError, createJobocateClient } from '@jobocate/api-sdk';
import { readPortalServerConfig } from '../../../lib/portal-config';
import { ConfigMissingNotice } from '../../../components/portal/ConfigMissingNotice';

type JobPayload = {
  id?: string;
  title?: string;
  description?: string;
  responsibilities?: string;
  qualifications?: string;
  status?: string;
  location?: string;
  locationCity?: string;
  locationRegion?: string;
  locationCountry?: string;
  employmentType?: string;
  remotePolicy?: string;
  salaryMinCents?: number;
  salaryMaxCents?: number;
  currencyCode?: string;
  skills?: string[];
};

export const dynamic = 'force-dynamic';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cfg = readPortalServerConfig();

  if (!cfg.jobServiceUrl) {
    return (
      <Shell>
        <ConfigMissingNotice
          envName="NEXT_PUBLIC_JOB_SERVICE_URL"
          example="http://localhost:8082"
        />
      </Shell>
    );
  }

  const client = createJobocateClient({
    baseUrl: cfg.jobServiceUrl,
    getTenantId: () => cfg.tenantId,
  });

  let job: JobPayload | null = null;
  let notFound = false;
  try {
    job = (await client.jobs.get(id)) as JobPayload;
  } catch (e) {
    if (e instanceof JobocateHttpError && e.status === 404) {
      notFound = true;
    }
  }

  if (notFound || !job) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Job not found</h1>
        <Link href="/jobs" className="mt-6 inline-block text-jobocate-coral hover:underline">
          Back to jobs
        </Link>
      </Shell>
    );
  }

  const composedLocation =
    job.location ??
    [job.locationCity, job.locationRegion, job.locationCountry].filter(Boolean).join(', ');

  return (
    <Shell>
      <article>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{job.status}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{job.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
          {composedLocation ? <span>{composedLocation}</span> : null}
          {job.employmentType ? (
            <span className="rounded-full bg-rose-50 px-2 py-0.5">{job.employmentType}</span>
          ) : null}
          {job.remotePolicy ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5">{job.remotePolicy}</span>
          ) : null}
          {job.salaryMinCents && job.salaryMaxCents ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
              {(job.salaryMinCents / 100).toLocaleString()} –{' '}
              {(job.salaryMaxCents / 100).toLocaleString()} {job.currencyCode}
            </span>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/jobs/${id}/apply`}
            className="rounded-full bg-jobocate-coral px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-jobocate-coralHover"
          >
            Apply now
          </Link>
          <Link
            href="/candidate/saved-jobs"
            className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Save for later
          </Link>
        </div>

        {job.description ? (
          <Section title="About the role" body={job.description} />
        ) : null}
        {job.responsibilities ? (
          <Section title="Responsibilities" body={job.responsibilities} />
        ) : null}
        {job.qualifications ? (
          <Section title="Qualifications" body={job.qualifications} />
        ) : null}
        {job.skills && job.skills.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-base font-semibold">Skills</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {job.skills.map((s) => (
                <li
                  key={s}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {s}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </Shell>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-slate-700">{body}</p>
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-landing-gradient text-jobocate-ink">
      <header className="border-b border-rose-100/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold text-jobocate-coral">
            JOBOCATE
          </Link>
          <Link href="/jobs" className="text-sm font-medium text-jobocate-coral hover:underline">
            ← All jobs
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
