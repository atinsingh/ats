import Link from 'next/link';
import { createJobocateClient, type ApplicationDetail, type Job } from '@jobocate/api-sdk';

import {
  EmptyState,
  ErrorBanner,
  MissingConfig,
  RecruiterShell,
} from '../../../components/RecruiterShell';
import { STAGES, STAGE_LABEL, STALL_DAYS, summarizePipeline } from '../../../lib/pipeline/summary';
import { readRecruiterConfig } from '../../../lib/recruiter-config';

export const dynamic = 'force-dynamic';

const MAX_JOBS = 25;

export default async function PipelinePage() {
  const title = 'Pipeline';
  const subtitle = 'Every open job, stage by stage. Stalled people are where to act first.';
  const cfg = readRecruiterConfig();
  if (!cfg.jobServiceUrl || !cfg.applicationServiceUrl) {
    return (
      <RecruiterShell title={title} subtitle={subtitle}>
        <MissingConfig
          envName={
            cfg.jobServiceUrl
              ? 'NEXT_PUBLIC_APPLICATION_SERVICE_URL'
              : 'NEXT_PUBLIC_JOB_SERVICE_URL'
          }
          example={cfg.jobServiceUrl ? 'http://localhost:8084' : 'http://localhost:8082'}
        />
      </RecruiterShell>
    );
  }

  const jobsClient = createJobocateClient({
    baseUrl: cfg.jobServiceUrl,
    getTenantId: () => cfg.tenantId,
  });
  const appsClient = createJobocateClient({
    baseUrl: cfg.applicationServiceUrl,
    getTenantId: () => cfg.tenantId,
  });

  let jobs: Job[] = [];
  try {
    jobs = await jobsClient.jobs.listForRecruiter({ status: 'PUBLISHED', limit: MAX_JOBS });
  } catch (e) {
    return (
      <RecruiterShell title={title} subtitle={subtitle}>
        <ErrorBanner
          message={`Could not load jobs: ${e instanceof Error ? e.message : 'unknown error'}`}
        />
      </RecruiterShell>
    );
  }

  if (jobs.length === 0) {
    return (
      <RecruiterShell title={title} subtitle={subtitle}>
        <EmptyState title="No open jobs" hint="Publish a job and its pipeline shows up here." />
      </RecruiterShell>
    );
  }

  // One request per job, in parallel. A failing job is reported in its row, not hidden.
  const settled = await Promise.allSettled(
    jobs.map((j) => appsClient.recruiterApplications.listForJob(j.id)),
  );
  const appsByJob: Record<string, ApplicationDetail[] | Error> = {};
  settled.forEach((r, i) => {
    appsByJob[jobs[i]!.id] =
      r.status === 'fulfilled'
        ? r.value
        : r.reason instanceof Error
          ? r.reason
          : new Error(String(r.reason));
  });
  const { rows, totals } = summarizePipeline(jobs, appsByJob);
  const failed = rows.filter((r) => r.error).length;

  return (
    <RecruiterShell title={title} subtitle={subtitle}>
      {failed ? (
        <ErrorBanner
          message={`${failed} of ${rows.length} jobs could not load their applications. Their rows show why.`}
        />
      ) : null}
      <section
        aria-label="Pipeline by job"
        className="mt-4 overflow-x-auto rounded-xl bg-card shadow-card"
      >
        <table className="w-full min-w-[760px] text-sm">
          <caption className="sr-only">
            Applications per stage for each open job. Stalled means no update for {STALL_DAYS} or
            more days.
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-caption text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-semibold">
                Job
              </th>
              {STAGES.map((s) => (
                <th key={s} scope="col" className="px-3 py-3 text-right font-semibold">
                  {STAGE_LABEL[s]}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Stalled
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.jobId}>
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  <Link
                    href={`/recruiter/jobs/${encodeURIComponent(r.jobId)}/applications`}
                    className="inline-flex min-h-target items-center hover:underline"
                  >
                    {r.title}
                  </Link>
                </th>
                {r.error ? (
                  <td colSpan={STAGES.length + 1} className="px-4 py-3 text-danger">
                    Could not load: {r.error}
                  </td>
                ) : (
                  <>
                    {STAGES.map((s) => (
                      <td
                        key={s}
                        className={`px-3 py-3 text-right tabular-nums ${r.counts[s] ? '' : 'text-muted-foreground'}`}
                      >
                        {r.counts[s] || '·'}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.stalled ? (
                        <span className="rounded-sm bg-warning-soft px-2 py-0.5 font-semibold text-warning">
                          {r.stalled}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">·</span>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border font-semibold">
              <th scope="row" className="px-4 py-3 text-left">
                All open jobs
              </th>
              {STAGES.map((s) => (
                <td key={s} className="px-3 py-3 text-right tabular-nums">
                  {totals.counts[s]}
                </td>
              ))}
              <td className="px-4 py-3 text-right tabular-nums">{totals.stalled}</td>
            </tr>
          </tfoot>
        </table>
      </section>
      <p className="mt-3 text-caption text-muted-foreground">
        Stalled: still in play with no update for {STALL_DAYS} or more days. Rejected, withdrawn and
        expired applications are left out. Showing up to {MAX_JOBS} open jobs.
      </p>
    </RecruiterShell>
  );
}
