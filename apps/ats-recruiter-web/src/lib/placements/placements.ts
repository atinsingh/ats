/**
 * Placements logic. Pay, bill and timesheets run in the firm's back office; Insyght shows them
 * read-only so a recruiter can act on extensions and redeployment. Dates are firm-local
 * YYYY-MM-DD. Pure and unit-tested (test/placements.test.ts).
 */

export type Extension = 'none' | 'asked' | 'agreed' | 'declined';

export interface Placement {
  id: string;
  contractor: string;
  client: string;
  role: string;
  start: string;
  end: string;
  /** Dollars per hour. */
  bill: number;
  pay: number;
  extension: Extension;
}

export type PlacementStatus = 'starting' | 'active' | 'ending' | 'ended';

export const STATUS_LABEL: Record<PlacementStatus, string> = {
  starting: 'Starting',
  active: 'Active',
  ending: 'Ending',
  ended: 'Ended',
};

/** Ending within this many days counts as ending soon. */
export const ENDING_DAYS = 30;
/** The firm's minimum margin. A representative setting until firm settings exist. */
export const MARGIN_FLOOR = 0.18;

const dayNumber = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
};

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string) => dayNumber(to) - dayNumber(from);

/** Gross margin as a share of bill, 0 to 1. */
export const margin = (p: Pick<Placement, 'bill' | 'pay'>) =>
  p.bill ? (p.bill - p.pay) / p.bill : 0;

export function placementStatus(p: Placement, today: string): PlacementStatus {
  if (daysBetween(today, p.start) > 0) return 'starting';
  const left = daysBetween(today, p.end);
  if (left < 0) return 'ended';
  if (left <= ENDING_DAYS) return 'ending';
  return 'active';
}

export interface Flag {
  tone: 'warning' | 'danger' | 'info';
  label: string;
}

/** Plain date and rate rules; nothing here is an AI judgement. */
export function placementFlags(p: Placement, today: string): Flag[] {
  const flags: Flag[] = [];
  const status = placementStatus(p, today);
  if (status === 'ending' && p.extension !== 'agreed') {
    const left = daysBetween(today, p.end);
    flags.push({
      tone: 'warning',
      label:
        p.extension === 'asked'
          ? `Extension asked, ends in ${left} days`
          : `Plan redeployment, ends in ${left} days`,
    });
  } else if (p.extension === 'asked' && status !== 'ended') {
    flags.push({ tone: 'info', label: 'Extension asked' });
  }
  if (margin(p) < MARGIN_FLOOR)
    flags.push({ tone: 'danger', label: `Margin below ${Math.round(MARGIN_FLOOR * 100)}%` });
  return flags;
}

/** Rows with flags first, then by end date, then by name. Ended placements are left out. */
export function sortPlacements(rows: readonly Placement[], today: string): Placement[] {
  return rows
    .filter((p) => placementStatus(p, today) !== 'ended')
    .sort(
      (a, b) =>
        Number(placementFlags(b, today).length > 0) - Number(placementFlags(a, today).length > 0) ||
        a.end.localeCompare(b.end) ||
        a.contractor.localeCompare(b.contractor),
    );
}

export interface PlacementTotals {
  onAssignment: number;
  starting: number;
  endingSoon: number;
  /** Bill-weighted average margin of those on assignment, or null with none. */
  averageMargin: number | null;
}

export function placementTotals(rows: readonly Placement[], today: string): PlacementTotals {
  const live = rows.filter((p) => {
    const s = placementStatus(p, today);
    return s === 'active' || s === 'ending';
  });
  const bill = live.reduce((n, p) => n + p.bill, 0);
  return {
    onAssignment: live.length,
    starting: rows.filter((p) => placementStatus(p, today) === 'starting').length,
    endingSoon: live.filter((p) => placementStatus(p, today) === 'ending').length,
    averageMargin: bill ? live.reduce((n, p) => n + (p.bill - p.pay), 0) / bill : null,
  };
}

/** "Dec 15, 2026" from a firm-local date. */
export const formatDate = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

export const formatPercent = (share: number) => `${(share * 100).toFixed(1)}%`;
