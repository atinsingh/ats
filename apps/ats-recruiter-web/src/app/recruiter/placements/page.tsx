import type { PlacementRecord } from '@jobocate/api-sdk';
import { cn } from '@jobocate/ui';

import { RecruiterShell } from '../../../components/RecruiterShell';
import { localDay } from '../../../lib/interviews/interviews';
import {
  ENDING_DAYS,
  MARGIN_FLOOR,
  STATUS_LABEL,
  formatDate,
  formatPercent,
  margin,
  placementFlags,
  placementStatus,
  placementTotals,
  sortPlacements,
  type Flag,
  type PlacementStatus,
} from '../../../lib/placements/placements';
import { toPlacementRows } from '../../../lib/placements/live';
import type { Placement } from '../../../lib/placements/placements';
import { representativePlacements } from '../../../lib/placements/representative';
import { readRecruiterConfig, type RecruiterConfig } from '../../../lib/recruiter-config';
import { loadSubmittalNames, recruiterClient } from '../../../lib/submittals/names';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';

const STATUS_TONE: Record<PlacementStatus, string> = {
  starting: 'bg-info-soft text-info',
  active: 'bg-success-soft text-success',
  ending: 'bg-warning-soft text-warning',
  ended: 'bg-muted text-muted-foreground',
};

const FLAG_TONE: Record<Flag['tone'], string> = {
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-card">
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-[28px] leading-9 tabular-nums">{value}</p>
      {note ? <p className="text-caption text-muted-foreground">{note}</p> : null}
    </div>
  );
}

/** The tenant's real placements, or null when application-service can't be reached. */
async function loadPlacements(cfg: RecruiterConfig): Promise<Placement[] | null> {
  if (!cfg.applicationServiceUrl) return null;
  let rows: PlacementRecord[];
  try {
    rows = await recruiterClient(cfg, cfg.applicationServiceUrl).placements.list(200);
  } catch {
    return null;
  }
  // The same name lookups as submittals: candidate, job and client by id.
  return toPlacementRows(rows, await loadSubmittalNames(cfg, rows));
}

export default async function PlacementsPage() {
  // Real placements whenever application-service answers; otherwise labelled representative
  // data. Pay, bill and timesheets stay in the back office; this view is read-only.
  const cfg = readRecruiterConfig();
  const today = localDay(new Date(), FIRM_TIME_ZONE);
  const live = await loadPlacements(cfg);
  const all = live ?? representativePlacements(today);
  const rows = sortPlacements(all, today);
  const totals = placementTotals(all, today);

  return (
    <RecruiterShell
      hideNewJob
      title="Placements"
      subtitle="People on assignment from your desk. Pay, bill and timesheets run in your back office; this shows them so you can act on extensions and redeployment."
    >
      <div className="flex flex-col gap-4">
        {live === null ? (
          <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
            Representative data. The placement service could not be reached, so these placements
            are samples.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="On assignment" value={String(totals.onAssignment)} />
          <Stat label="Starting soon" value={String(totals.starting)} />
          <Stat
            label="Ending soon"
            value={String(totals.endingSoon)}
            note={`Within ${ENDING_DAYS} days`}
          />
          <Stat
            label="Average margin"
            value={totals.averageMargin === null ? '–' : formatPercent(totals.averageMargin)}
            note={`Floor ${Math.round(MARGIN_FLOOR * 100)}%`}
          />
        </div>

        <section aria-label="Placements" className="overflow-x-auto rounded-xl bg-card shadow-card">
          <table className="w-full min-w-[900px] text-sm">
            <caption className="sr-only">
              Placements, those needing action first: ending within {ENDING_DAYS} days without an
              agreed extension, an extension asked, or a margin below the floor.
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-caption text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Contractor
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Client and role
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Start
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  End
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Bill / pay per hour
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Margin
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => {
                const status = placementStatus(p, today);
                const flags = placementFlags(p, today);
                return (
                  <tr key={p.id}>
                    <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-medium">
                      {p.contractor}
                    </th>
                    <td className="px-3 py-3">
                      {p.client}
                      <span className="block text-caption text-muted-foreground">{p.role}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{formatDate(p.start)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{formatDate(p.end)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                      ${p.bill} / ${p.pay}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-3 text-right tabular-nums',
                        margin(p) < MARGIN_FLOOR && 'font-semibold text-danger',
                      )}
                    >
                      {formatPercent(margin(p))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'rounded-sm px-2 py-0.5 text-caption font-semibold',
                            STATUS_TONE[status],
                          )}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                        {flags.map((f) => (
                          <span
                            key={f.label}
                            className={cn(
                              'rounded-sm px-2 py-0.5 text-caption font-semibold',
                              FLAG_TONE[f.tone],
                            )}
                          >
                            {f.label}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <p className="text-caption text-muted-foreground">
          Margin is (bill − pay) ÷ bill, before burden. Ended placements are not shown. For anyone
          ending soon without an extension, the Account agent drafts a redeployment check-in in your
          Review queue.
        </p>
      </div>
    </RecruiterShell>
  );
}
