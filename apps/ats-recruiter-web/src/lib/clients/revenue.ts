import type { PlacementRecord } from '@jobocate/api-sdk';

/**
 * Estimated client revenue from placements. Real billing runs from timesheets in the back office,
 * so this is an estimate: bill rate × a standard 8-hour weekday, for each weekday a placement was
 * on assignment in the last 12 months, up to today.
 */

export const HOURS_PER_DAY = 8;
export const REVENUE_NOTE = 'Estimated from placements at 40 hours a week';

const DAY = 86_400_000;

/** Midnight UTC for a YYYY-MM-DD date. */
function dayStart(isoDate: string): number {
  return Date.parse(`${isoDate.slice(0, 10)}T00:00:00Z`);
}

/** Weekdays from `from` to `to`, both inclusive, as UTC midnights. 0 when `to` is before `from`. */
export function weekdaysBetween(from: number, to: number): number {
  if (to < from) return 0;
  const days = Math.floor((to - from) / DAY) + 1;
  let n = Math.floor(days / 7) * 5;
  const startDow = new Date(from).getUTCDay();
  for (let i = 0; i < days % 7; i++) {
    const dow = (startDow + i) % 7;
    if (dow !== 0 && dow !== 6) n++;
  }
  return n;
}

type RevenueRow = Pick<PlacementRecord, 'clientId' | 'startDate' | 'endDate' | 'billRate'>;

/** One placement's estimated revenue in the 12 months up to `today` (YYYY-MM-DD). */
export function placementRevenue12m(p: RevenueRow, today: string): number {
  const end = dayStart(today);
  const windowStart = end - 364 * DAY;
  const from = Math.max(dayStart(p.startDate), windowStart);
  const to = Math.min(dayStart(p.endDate), end);
  return weekdaysBetween(from, to) * HOURS_PER_DAY * Number(p.billRate);
}

/** Estimated revenue per client id. Placements without a client are left out. */
export function revenueByClient(rows: readonly RevenueRow[], today: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of rows) {
    if (!p.clientId) continue;
    out.set(p.clientId, (out.get(p.clientId) ?? 0) + placementRevenue12m(p, today));
  }
  return out;
}
