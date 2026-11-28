'use client';

import type { ReactNode } from 'react';
import { Button } from '@jobocate/ui';

import {
  formatDollars,
  formatShare,
  toCsv,
  type AgentRow,
  type FunnelStep,
  type SourceRow,
} from '../../lib/reports/reports';

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Section({
  id,
  title,
  hint,
  onExport,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  onExport: () => void;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={id} className="font-display text-[22px] leading-7">
            {title}
          </h2>
          <p className="text-caption text-muted-foreground">{hint}</p>
        </div>
        <Button variant="outline" size="sm" className="min-h-target" onClick={onExport}>
          Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

const th = 'px-3 py-2 font-semibold';
const num = 'px-3 py-2 text-right tabular-nums';

export function ReportsBoard({
  funnel,
  sources,
  agents,
  representative,
}: {
  funnel: FunnelStep[];
  sources: SourceRow[];
  agents: AgentRow[];
  representative: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      {representative ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Representative data. Reporting is not connected yet, so these figures are samples.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          From applications, submittals, interviews, offers, placements and agent drafts in the last
          90 days. Spend, edits and time saved are not tracked yet, so they show –.
        </p>
      )}

      <Section
        id="funnel-title"
        title="Funnel"
        hint="All jobs on your desk. Agents prepare; people decide every move."
        onExport={() =>
          download(
            'funnel.csv',
            toCsv(
              ['Stage', 'Count', 'Of previous', 'Of top'],
              funnel.map((s) => [
                s.stage,
                s.count,
                formatShare(s.ofPrevious),
                formatShare(s.ofTop),
              ]),
            ),
          )
        }
      >
        <table className="w-full min-w-[480px] text-sm">
          <caption className="sr-only">
            Candidates at each stage, with the share kept from the stage before.
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-caption text-muted-foreground">
              <th scope="col" className={th}>
                Stage
              </th>
              <th scope="col" className={`${th} w-1/2`}>
                <span className="sr-only">Bar</span>
              </th>
              <th scope="col" className={`${th} text-right`}>
                Count
              </th>
              <th scope="col" className={`${th} text-right`}>
                From previous
              </th>
            </tr>
          </thead>
          <tbody>
            {funnel.map((s) => (
              <tr key={s.stage}>
                <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium">
                  {s.stage}
                </th>
                <td className="px-3 py-2">
                  <div className="h-2 rounded-full bg-muted" aria-hidden="true">
                    <div
                      className="h-2 rounded-full bg-foreground"
                      style={{ width: `${Math.max(s.ofTop * 100, s.count ? 1 : 0)}%` }}
                    />
                  </div>
                </td>
                <td className={num}>{s.count.toLocaleString('en-US')}</td>
                <td className={`${num} text-muted-foreground`}>{formatShare(s.ofPrevious)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section
          id="sources-title"
          title="Where starts came from"
          hint="Spend is what the period cost; free sources cost $0 per start."
          onExport={() =>
            download(
              'sources.csv',
              toCsv(
                ['Source', 'Submitted', 'Started', 'Spend', 'Spend note', 'Cost per start'],
                sources.map((s) => [
                  s.source,
                  s.submitted,
                  s.started,
                  s.spend,
                  s.spendNote ?? '',
                  s.costPerStart === null ? '' : Math.round(s.costPerStart),
                ]),
              ),
            )
          }
        >
          <table className="w-full min-w-[480px] text-sm">
            <caption className="sr-only">Submittals, starts and cost per start by source.</caption>
            <thead>
              <tr className="border-b border-border text-left text-caption text-muted-foreground">
                <th scope="col" className={th}>
                  Source
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Submitted
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Started
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Spend
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Per start
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sources.map((s) => (
                <tr key={s.source}>
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    {s.source}
                  </th>
                  <td className={num}>{s.submitted}</td>
                  <td className={num}>{s.started}</td>
                  <td className={num}>
                    {formatDollars(s.spend)}
                    {s.spendNote ? (
                      <span className="block text-caption text-muted-foreground">
                        {s.spendNote}
                      </span>
                    ) : null}
                  </td>
                  <td className={num}>{formatDollars(s.costPerStart)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section
          id="agents-title"
          title="Agent results"
          hint="Of the proposals people decided. Edited and rejected drafts train nothing outside your firm."
          onExport={() =>
            download(
              'agents.csv',
              toCsv(
                [
                  'Agent',
                  'Proposals',
                  'Decided',
                  'Approved as is',
                  'Edited',
                  'Rejected',
                  'Hours saved',
                ],
                agents.map((a) => [
                  a.agent,
                  a.proposals,
                  a.decided,
                  formatShare(a.approvedShare),
                  formatShare(a.editedShare),
                  formatShare(a.rejectedShare),
                  a.hoursSaved,
                ]),
              ),
            )
          }
        >
          <table className="w-full min-w-[480px] text-sm">
            <caption className="sr-only">
              How often people approved, edited or rejected each agent&apos;s proposals.
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-caption text-muted-foreground">
                <th scope="col" className={th}>
                  Agent
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Proposals
                </th>
                <th scope="col" className={`${th} text-right`}>
                  As is
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Edited
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Rejected
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Hours saved
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agents.map((a) => (
                <tr key={a.agent}>
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    {a.agent}
                  </th>
                  <td className={num}>{a.proposals}</td>
                  <td className={num}>{formatShare(a.approvedShare)}</td>
                  <td className={num}>{formatShare(a.editedShare)}</td>
                  <td className={num}>{formatShare(a.rejectedShare)}</td>
                  <td className={num}>{a.hoursSaved ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
      <p className="text-caption text-muted-foreground">
        Your desk, last 90 days. Hours saved are estimates from your firm&apos;s per-task times.
      </p>
    </div>
  );
}
