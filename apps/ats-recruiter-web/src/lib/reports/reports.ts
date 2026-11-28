/**
 * Desk report logic: funnel conversion, cost per start by source, and how often people accept,
 * edit or reject each agent's proposals. Pure and unit-tested (test/reports.test.ts).
 */

export interface FunnelCount {
  stage: string;
  count: number;
}

export interface FunnelStep extends FunnelCount {
  /** Share of the previous stage, 0 to 1; null for the first stage or a zero previous count. */
  ofPrevious: number | null;
  /** Share of the first stage, 0 to 1. */
  ofTop: number;
}

export function funnelSteps(counts: readonly FunnelCount[]): FunnelStep[] {
  const top = counts[0]?.count ?? 0;
  return counts.map((c, i) => {
    const prev = i === 0 ? null : counts[i - 1]!.count;
    return {
      ...c,
      ofPrevious: prev ? c.count / prev : null,
      ofTop: top ? c.count / top : 0,
    };
  });
}

export interface SourceResult {
  source: string;
  submitted: number;
  started: number;
  /** Dollars spent in the period, or null when spend is not tracked. */
  spend: number | null;
  /** What the spend was, e.g. "bonuses" or "seat share". */
  spendNote?: string;
}

export interface SourceRow extends SourceResult {
  /** Dollars per start, or null with no starts. */
  costPerStart: number | null;
  /** Starts per submittal, 0 to 1, or null with no submittals. */
  startRate: number | null;
}

/** Most starts first, then cheapest per start, then by name. */
export function sourceRows(rows: readonly SourceResult[]): SourceRow[] {
  return rows
    .map((r) => ({
      ...r,
      costPerStart: r.started && r.spend !== null ? r.spend / r.started : null,
      startRate: r.submitted ? r.started / r.submitted : null,
    }))
    .sort(
      (a, b) =>
        b.started - a.started ||
        (a.costPerStart ?? Infinity) - (b.costPerStart ?? Infinity) ||
        a.source.localeCompare(b.source),
    );
}

export interface AgentResult {
  agent: string;
  proposals: number;
  approved: number;
  /** Approved after a person's edit, or null when edits are not tracked. */
  edited: number | null;
  rejected: number;
  /** Estimated minutes a person saved, from the firm's per-task estimates; null when unknown. */
  minutesSaved: number | null;
}

export interface AgentRow extends AgentResult {
  decided: number;
  /** Shares of decided proposals, 0 to 1; null when none are decided. */
  approvedShare: number | null;
  editedShare: number | null;
  rejectedShare: number | null;
  hoursSaved: number | null;
}

export function agentRows(rows: readonly AgentResult[]): AgentRow[] {
  return rows.map((r) => {
    const decided = r.approved + (r.edited ?? 0) + r.rejected;
    if (decided > r.proposals)
      throw new Error(`${r.agent}: more decisions (${decided}) than proposals (${r.proposals})`);
    const share = (n: number) => (decided ? n / decided : null);
    return {
      ...r,
      decided,
      approvedShare: share(r.approved),
      editedShare: r.edited === null ? null : share(r.edited),
      rejectedShare: share(r.rejected),
      hoursSaved: r.minutesSaved === null ? null : Math.round(r.minutesSaved / 60),
    };
  });
}

export const formatShare = (s: number | null) => (s === null ? '–' : `${Math.round(s * 100)}%`);

export const formatDollars = (n: number | null) =>
  n === null ? '–' : `$${Math.round(n).toLocaleString('en-US')}`;

/** RFC 4180 CSV: fields with a comma, quote or line break are quoted and quotes doubled. */
export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    // A leading =, +, - or @ would run as a formula in a spreadsheet; prefix it with a quote.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
