import Link from 'next/link';
import {
  JobocateHttpError,
  createJobocateClient,
  type ApplicationDetail,
  type Job,
} from '@jobocate/api-sdk';
import {
  EmptyState,
  ErrorBanner,
  MissingConfig,
  RecruiterShell,
  StatusPill,
} from '../../../../../components/RecruiterShell';
import { readRecruiterConfig } from '../../../../../lib/recruiter-config';

export const dynamic = 'force-dynamic';

const PIPELINE_STAGES: Array<ApplicationDetail['status']> = [
  'APPLIED',
  'SCREENING',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEWED',
  'OFFERED',
  'HIRED',
];

export default async function JobApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const view = sp.view === 'list' ? 'list' : 'kanban';

  const cfg = readRecruiterConfig();
  if (!cfg.applicationServiceUrl || !cfg.jobServiceUrl) {
    return (
      <RecruiterShell title="Applicants">
        <MissingConfig envName="NEXT_PUBLIC_APPLICATION_SERVICE_URL" example="http://localhost:8084" />
      </RecruiterShell>
    );
  }

  const jobClient = createJobocateClient({
    baseUrl: cfg.jobServiceUrl,
    getTenantId: () => cfg.tenantId,
  });
  const appClient = createJobocateClient({
    baseUrl: cfg.applicationServiceUrl,
    getTenantId: () => cfg.tenantId,
  });

  let job: Job | null = null;
  let apps: ApplicationDetail[] = [];
  let error: string | null = null;
  try {
    [job, apps] = await Promise.all([
      jobClient.jobs.get(id),
      appClient.recruiterApplications.listForJob(id),
    ]);
  } catch (e) {
    if (e instanceof JobocateHttpError && e.status === 404) {
      apps = [];
    } else {
      error = e instanceof Error ? e.message : 'Failed to load applicants';
    }
  }

  return (
    <RecruiterShell
      title={`Applicants — ${job?.title ?? id}`}
      subtitle={`${apps.length} candidate${apps.length === 1 ? '' : 's'}`}
      actions={
        <div className="flex gap-1 rounded-full border border-slate-200 bg-white p-1">
          <Link
            href={`/recruiter/jobs/${id}/applications?view=kanban`}
            className={
              view === 'kanban'
                ? 'rounded-full bg-slate-900 px-4 py-1 text-sm font-medium text-white'
                : 'rounded-full px-4 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100'
            }
          >
            Kanban
          </Link>
          <Link
            href={`/recruiter/jobs/${id}/applications?view=list`}
            className={
              view === 'list'
                ? 'rounded-full bg-slate-900 px-4 py-1 text-sm font-medium text-white'
                : 'rounded-full px-4 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100'
            }
          >
            List
          </Link>
        </div>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}

      {apps.length === 0 && !error ? (
        <EmptyState
          title="No applicants yet"
          hint="Share the public job link to start receiving applications."
        />
      ) : view === 'kanban' ? (
        <KanbanBoard apps={apps} />
      ) : (
        <ApplicantsTable apps={apps} />
      )}
    </RecruiterShell>
  );
}

function KanbanBoard({ apps }: { apps: ApplicationDetail[] }) {
  const grouped = groupByStage(apps);
  return (
    <div className="grid auto-cols-[16rem] grid-flow-col gap-3 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => {
        const stageApps = grouped[stage] ?? [];
        return (
          <section
            key={stage}
            aria-label={stage}
            className="flex h-fit max-h-[70vh] flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-3"
          >
            <header className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {stage.replace('_', ' ').toLowerCase()}
              </h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                {stageApps.length}
              </span>
            </header>
            <ul className="space-y-2 overflow-y-auto pr-1" role="list">
              {stageApps.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/recruiter/candidates/${a.candidateProfileId}?app=${a.id}`}
                    className="block rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {a.jobTitle ?? 'Application'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Applied {new Date(a.appliedAt).toLocaleDateString()}
                    </p>
                    <div className="mt-2"><StatusPill status={a.status} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ApplicantsTable({ apps }: { apps: ApplicationDetail[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Candidate</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Applied</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {apps.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  href={`/recruiter/candidates/${a.candidateProfileId}?app=${a.id}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {a.candidateProfileId.slice(0, 8)}…
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-700">{a.source ?? '—'}</td>
              <td className="px-4 py-3 text-slate-700">
                {new Date(a.appliedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3"><StatusPill status={a.status} /></td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/recruiter/candidates/${a.candidateProfileId}?app=${a.id}`}
                  className="text-sm font-medium text-slate-700 hover:underline"
                >
                  Review →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function groupByStage(apps: ApplicationDetail[]): Record<string, ApplicationDetail[]> {
  return apps.reduce<Record<string, ApplicationDetail[]>>((acc, a) => {
    (acc[a.status] ??= []).push(a);
    return acc;
  }, {});
}
