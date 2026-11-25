/**
 * Pipeline overview across jobs: stage counts, active and stalled applications per job.
 * Pure, so it is unit-tested (test/pipeline-summary.test.ts).
 */

export const STAGES = [
  'APPLIED',
  'SCREENING',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
  'HIRED',
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview',
  OFFERED: 'Offered',
  HIRED: 'Hired',
};

/** Days without an update after which an active application counts as stalled. */
export const STALL_DAYS = 5;

const TERMINAL = new Set(['HIRED', 'REJECTED', 'WITHDRAWN', 'EXPIRED']);
const CLOSED = new Set(['REJECTED', 'WITHDRAWN', 'EXPIRED']);

export interface AppLike {
  status: string;
  appliedAt: string;
  updatedAt?: string;
}

export interface JobLike {
  id: string;
  title: string;
}

export type StageCounts = Record<Stage, number>;

export interface PipelineRow {
  jobId: string;
  title: string;
  counts: StageCounts;
  /** Applications still in play (not rejected, withdrawn or expired). Includes hired. */
  active: number;
  closed: number;
  stalled: number;
  error?: string;
}

const emptyCounts = (): StageCounts => Object.fromEntries(STAGES.map((s) => [s, 0])) as StageCounts;

function stageOf(status: string): Stage | null {
  if (status === 'INTERVIEW_SCHEDULED' || status === 'INTERVIEWED') return 'INTERVIEW';
  return (STAGES as readonly string[]).includes(status) ? (status as Stage) : null;
}

export function summarizePipeline(
  jobs: readonly JobLike[],
  appsByJob: Readonly<Record<string, readonly AppLike[] | Error>>,
  now: Date = new Date(),
): { rows: PipelineRow[]; totals: Omit<PipelineRow, 'jobId' | 'title' | 'error'> } {
  const cutoff = now.getTime() - STALL_DAYS * 86_400_000;
  const rows = jobs.map((job): PipelineRow => {
    const row: PipelineRow = {
      jobId: job.id,
      title: job.title,
      counts: emptyCounts(),
      active: 0,
      closed: 0,
      stalled: 0,
    };
    const apps = appsByJob[job.id];
    if (apps instanceof Error) return { ...row, error: apps.message };
    for (const a of apps ?? []) {
      if (CLOSED.has(a.status)) {
        row.closed++;
        continue;
      }
      const stage = stageOf(a.status);
      if (stage) row.counts[stage]++;
      row.active++;
      const touched = Date.parse(a.updatedAt ?? a.appliedAt);
      if (!TERMINAL.has(a.status) && touched <= cutoff) row.stalled++;
    }
    return row;
  });
  rows.sort(
    (x, y) => Number(!!x.error) - Number(!!y.error) || y.stalled - x.stalled || y.active - x.active,
  );
  const totals = { counts: emptyCounts(), active: 0, closed: 0, stalled: 0 };
  for (const r of rows) {
    for (const s of STAGES) totals.counts[s] += r.counts[s];
    totals.active += r.active;
    totals.closed += r.closed;
    totals.stalled += r.stalled;
  }
  return { rows, totals };
}
