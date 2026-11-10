import Link from 'next/link';
import {
  JobocateHttpError,
  createJobocateClient,
  type Resume,
  type ResumeParsedFields,
} from '@jobocate/api-sdk';
import { readPortalServerConfig } from '../../../../lib/portal-config';
import { ConfigMissingNotice, ErrorBanner } from '../../../../components/portal/ConfigMissingNotice';
import { ParsedFieldsActions } from './actions';

export const dynamic = 'force-dynamic';

export default async function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    getCandidateId: () => cfg.candidateUserId,
  });

  let resume: Resume | null = null;
  let parsed: ResumeParsedFields | null = null;
  let error: string | null = null;
  try {
    [resume, parsed] = await Promise.all([
      client.resumes.get(id),
      client.resumes.parsedFields(id).catch(() => null),
    ]);
  } catch (e) {
    if (e instanceof JobocateHttpError && e.status === 404) {
      error = 'Resume not found';
    } else {
      error = e instanceof Error ? e.message : 'Failed to load resume';
    }
  }

  if (error) return <ErrorBanner message={error} />;
  if (!resume) return null;

  const status = resume.parserStatus;

  return (
    <section aria-label="Resume" className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{resume.fileName}</h2>
          <p className="mt-1 text-sm text-jobocate-muted">
            Uploaded {new Date(resume.uploadedAt).toLocaleString()} ·{' '}
            {(resume.sizeBytes / 1024).toFixed(0)} KB · status {status.toLowerCase()}
          </p>
        </div>
        <Link
          href="/candidate/resumes"
          className="text-sm font-medium text-slate-600 hover:underline"
        >
          ← All resumes
        </Link>
      </header>

      {status === 'PENDING' || status === 'IN_PROGRESS' ? (
        <PendingPanel status={status} />
      ) : status === 'FAILED' ? (
        <FailedPanel error={resume.parserError} />
      ) : parsed && parsed.reviewStatus !== 'PENDING' ? (
        <ParsedFieldsCard
          resumeId={id}
          parsed={parsed}
          baseUrl={cfg.candidateServiceUrl}
          tenantId={cfg.tenantId}
          candidateId={cfg.candidateUserId}
        />
      ) : (
        <PendingPanel status="PENDING" />
      )}
    </section>
  );
}

function PendingPanel({ status }: { status: string }) {
  return (
    <div
      role="status"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"
    >
      <p className="font-semibold">Parsing in progress</p>
      <p className="mt-1">
        Status: <code>{status.toLowerCase()}</code>. Refresh the page in a moment to review the
        extracted fields.
      </p>
    </div>
  );
}

function FailedPanel({ error }: { error?: string | null }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900"
    >
      <p className="font-semibold">Parsing failed</p>
      <p className="mt-1">
        {error ?? 'The parser couldn\'t read this resume. Try uploading again or use a different file.'}
      </p>
    </div>
  );
}

function ParsedFieldsCard({
  resumeId,
  parsed,
  baseUrl,
  tenantId,
  candidateId,
}: {
  resumeId: string;
  parsed: ResumeParsedFields;
  baseUrl: string;
  tenantId: string;
  candidateId: string;
}) {
  const reviewed = parsed.reviewStatus !== 'PROPOSED';
  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Extracted fields</h3>
          <p className="text-xs text-jobocate-muted">
            Review status: {parsed.reviewStatus.toLowerCase()}
            {parsed.parserVersion ? ` · parser ${parsed.parserVersion}` : ''}
          </p>
        </div>
        {!reviewed ? (
          <ParsedFieldsActions
            resumeId={resumeId}
            baseUrl={baseUrl}
            tenantId={tenantId}
            candidateId={candidateId}
          />
        ) : null}
      </header>

      <dl className="grid gap-3 sm:grid-cols-2">
        <Row label="Full name" value={parsed.fullName} />
        <Row label="Email" value={parsed.email} />
        <Row label="Phone" value={parsed.phone} />
        <Row label="City" value={parsed.locationCity} />
        <Row label="Region" value={parsed.locationRegion} />
        <Row label="Country" value={parsed.locationCountry} />
        <Row
          label="Total experience"
          value={parsed.totalExperienceYears ? `${parsed.totalExperienceYears} years` : null}
        />
      </dl>

      {parsed.skills && parsed.skills.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-slate-800">Skills</p>
          <ul className="mt-2 flex flex-wrap gap-2" role="list">
            {parsed.skills.map((s) => (
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
    </article>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value || '—'}</dd>
    </div>
  );
}
