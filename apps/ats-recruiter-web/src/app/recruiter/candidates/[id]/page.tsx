import Link from 'next/link';
import {
  JobocateHttpError,
  createJobocateClient,
  type ApplicationDetail,
  type CandidateProfile,
  type TimelineEntry,
} from '@jobocate/api-sdk';
import {
  ErrorBanner,
  MissingConfig,
  RecruiterShell,
  StatusPill,
} from '../../../../components/RecruiterShell';
import { readRecruiterConfig } from '../../../../lib/recruiter-config';
import { ApplicationStatusActions } from './status-actions';

export const dynamic = 'force-dynamic';

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ app?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const cfg = readRecruiterConfig();

  if (!cfg.candidateServiceUrl) {
    return (
      <RecruiterShell title="Candidate">
        <MissingConfig envName="NEXT_PUBLIC_CANDIDATE_SERVICE_URL" example="http://localhost:8083" />
      </RecruiterShell>
    );
  }

  const candidateClient = createJobocateClient({
    baseUrl: cfg.candidateServiceUrl,
    getTenantId: () => cfg.tenantId,
  });
  const appClient = cfg.applicationServiceUrl
    ? createJobocateClient({
        baseUrl: cfg.applicationServiceUrl,
        getTenantId: () => cfg.tenantId,
      })
    : null;

  let candidate: CandidateProfile | null = null;
  let application: ApplicationDetail | null = null;
  let timeline: TimelineEntry[] = [];
  let error: string | null = null;

  try {
    candidate = await candidateClient.recruiterCandidates.get(id);
  } catch (e) {
    if (!(e instanceof JobocateHttpError && e.status === 404)) {
      error = e instanceof Error ? e.message : 'Failed to load candidate';
    }
  }

  if (sp.app && appClient) {
    try {
      application = await appClient.recruiterApplications.get(sp.app);
      timeline = await appClient.recruiterApplications.timeline(sp.app);
    } catch {
      // Tolerate missing application — recruiter can still view profile.
    }
  }

  if (!candidate) {
    return (
      <RecruiterShell title="Candidate not found">
        <Link href="/recruiter/jobs" className="text-sm text-slate-700 hover:underline">
          ← Back
        </Link>
      </RecruiterShell>
    );
  }

  return (
    <RecruiterShell
      title={candidate.fullName || 'Candidate'}
      subtitle={candidate.headline ?? candidate.email}
      actions={application ? <StatusPill status={application.status} /> : null}
    >
      {error ? <ErrorBanner message={error} /> : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {application && cfg.applicationServiceUrl ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">Current application</h2>
                <Link
                  href={`/recruiter/jobs/${application.jobId}/applications`}
                  className="text-sm text-slate-600 hover:underline"
                >
                  View pipeline →
                </Link>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Job:{' '}
                <Link
                  href={`/recruiter/jobs/${application.jobId}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {application.jobTitle ?? application.jobId}
                </Link>
              </p>
              {application.coverLetterText ? (
                <details className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <summary className="cursor-pointer text-slate-700">Cover letter</summary>
                  <p className="mt-2 whitespace-pre-wrap text-slate-700">
                    {application.coverLetterText}
                  </p>
                </details>
              ) : null}
              <div className="mt-4">
                <ApplicationStatusActions
                  apiBase={cfg.applicationServiceUrl}
                  tenantId={cfg.tenantId}
                  applicationId={application.id}
                  current={application.status}
                />
              </div>
            </div>
          ) : null}

          {candidate.summary ? (
            <Section title="Summary">
              <p className="whitespace-pre-wrap text-sm text-slate-700">{candidate.summary}</p>
            </Section>
          ) : null}

          {candidate.skills && candidate.skills.length > 0 ? (
            <Section title="Skills">
              <ul className="flex flex-wrap gap-2">
                {candidate.skills.map((s) => (
                  <li
                    key={s}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {timeline.length > 0 ? (
            <Section title="Timeline">
              <ol className="space-y-3 text-sm" role="list">
                {timeline.map((t) => (
                  <li key={t.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {new Date(t.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 font-medium text-slate-800">{t.summary ?? t.entryType}</p>
                    {t.fromValue || t.toValue ? (
                      <p className="text-xs text-slate-500">
                        {t.fromValue ?? '—'} → {t.toValue ?? '—'}
                        {t.actorRole ? ` · ${t.actorRole.toLowerCase()}` : ''}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">Profile</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Email" value={candidate.email} />
              <Row
                label="Location"
                value={[candidate.locationCity, candidate.locationRegion, candidate.locationCountry]
                  .filter(Boolean)
                  .join(', ') || '—'}
              />
              <Row label="Visibility" value={candidate.visibility.replace('_', ' ').toLowerCase()} />
              <Row label="Availability" value={candidate.availability ?? '—'} />
              <Row
                label="Salary expectation"
                value={
                  candidate.salaryExpectationMinCents != null && candidate.salaryExpectationMaxCents != null
                    ? `${(candidate.salaryExpectationMinCents / 100).toLocaleString()} – ${(candidate.salaryExpectationMaxCents / 100).toLocaleString()} ${candidate.currencyCode ?? ''}`
                    : '—'
                }
              />
              <Row label="Searchable" value={candidate.consentSearchable ? 'Yes' : 'No'} />
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">Resume</h2>
            <p className="mt-2 text-sm text-slate-600">
              Resumes load via the candidate-service detail endpoint. Wire the viewer next.
            </p>
          </div>
        </aside>
      </div>
    </RecruiterShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
