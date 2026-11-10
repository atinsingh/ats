import {
  JobocateHttpError,
  createJobocateClient,
  type Resume,
} from '@jobocate/api-sdk';
import Link from 'next/link';
import { readPortalServerConfig } from '../../../lib/portal-config';
import {
  ConfigMissingNotice,
  EmptyState,
  ErrorBanner,
} from '../../../components/portal/ConfigMissingNotice';

export const dynamic = 'force-dynamic';

export default async function ResumesPage() {
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

  let resumes: Resume[] = [];
  let error: string | null = null;
  try {
    resumes = await client.resumes.mine();
  } catch (e) {
    if (e instanceof JobocateHttpError && e.status === 404) {
      resumes = [];
    } else {
      error = e instanceof Error ? e.message : 'Failed to load resumes';
    }
  }

  if (error) return <ErrorBanner message={error} />;

  return (
    <section aria-label="Resumes" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-jobocate-muted">
          PDF, DOC, DOCX (≤10 MB). Uploads enter parsing automatically.
        </p>
        <Link
          href="/candidate/resumes/upload"
          className="rounded-full bg-jobocate-coral px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-jobocate-coralHover"
        >
          Upload resume
        </Link>
      </div>

      {resumes.length === 0 ? (
        <EmptyState
          title="No resumes yet"
          hint="Upload at least one resume to apply for jobs and unlock AI-assisted features."
        />
      ) : (
        <ul className="space-y-3" role="list">
          {resumes.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-slate-900">{r.fileName}</p>
                <p className="text-xs text-jobocate-muted">
                  Uploaded {formatDate(r.uploadedAt)} · {(r.sizeBytes / 1024).toFixed(0)} KB ·{' '}
                  <ParserBadge status={r.parserStatus} />
                </p>
              </div>
              <div className="flex items-center gap-2">
                {r.isPrimary ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Primary
                  </span>
                ) : null}
                <Link
                  href={`/candidate/resumes/${r.id}`}
                  className="text-sm font-medium text-jobocate-coral hover:underline"
                >
                  View parsed fields
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ParserBadge({ status }: { status: Resume['parserStatus'] }) {
  const palette: Record<Resume['parserStatus'], string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    IN_PROGRESS: 'bg-amber-50 text-amber-800',
    PARSED: 'bg-emerald-50 text-emerald-800',
    FAILED: 'bg-red-50 text-red-800',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${palette[status]}`}>
      {status.replace('_', ' ').toLowerCase()}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}
