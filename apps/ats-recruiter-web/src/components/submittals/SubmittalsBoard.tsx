'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Icon, cn } from '@jobocate/ui';

import {
  FOLLOW_UP_BUSINESS_DAYS,
  NEEDS_YOU,
  STATUS_LABEL,
  clientSilence,
  clientsOf,
  filterSubmittals,
  followUpDue,
  formatBillRate,
  sortSubmittals,
  submittalStats,
  type Submittal,
  type SubmittalStatus,
} from '../../lib/submittals/submittals';

const STATUS_TONE: Record<SubmittalStatus, string> = {
  'awaiting-approval': 'bg-info-soft text-info',
  blocked: 'bg-danger-soft text-danger',
  'client-reviewing': 'bg-muted text-foreground',
  interview: 'bg-success-soft text-success',
  offer: 'bg-success-soft text-success',
  'client-passed': 'bg-muted text-muted-foreground',
  withdrawn: 'bg-muted text-muted-foreground',
};

const STATUSES = Object.keys(STATUS_LABEL) as SubmittalStatus[];

const selectClass =
  'h-control rounded-lg bg-card px-3 text-sm shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-card">
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-[28px] leading-9 tabular-nums">{value}</p>
      {note ? <p className="text-caption text-muted-foreground">{note}</p> : null}
    </div>
  );
}

export function SubmittalsBoard({
  submittals,
  now,
  representative,
}: {
  submittals: Submittal[];
  /** ISO time the page was rendered, so server and client agree on ages. */
  now: string;
  representative: boolean;
}) {
  const at = useMemo(() => new Date(now), [now]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SubmittalStatus | 'all'>('all');
  const [client, setClient] = useState('all');

  const stats = useMemo(() => submittalStats(submittals, at), [submittals, at]);
  const clients = useMemo(() => clientsOf(submittals), [submittals]);
  const rows = useMemo(
    () => sortSubmittals(filterSubmittals(submittals, { query, status, client }), at),
    [submittals, query, status, client, at],
  );
  const duplicates = submittals.filter((s) => s.block?.kind === 'duplicate');
  const filtered = query.trim() !== '' || status !== 'all' || client !== 'all';

  return (
    <div className="flex flex-col gap-4">
      {representative ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Representative data. The submittal service could not be reached, so these rows are
          samples. Nothing is sent from this page.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Submitted this week" value={String(stats.submittedThisWeek)} />
        <Stat
          label="Submit to interview"
          value={
            stats.submitToInterview === null ? '–' : `${Math.round(stats.submitToInterview * 100)}%`
          }
        />
        <Stat
          label="Waiting on clients"
          value={String(stats.waitingOnClients)}
          note={stats.followUpsDue ? `${stats.followUpsDue} need a follow-up` : undefined}
        />
        <Stat
          label="Median time to submit"
          value={
            stats.medianHoursToSubmit === null ? '–' : `${Math.round(stats.medianHoursToSubmit)} h`
          }
          note="From shortlist"
        />
      </div>

      {duplicates.map((s) => (
        <div key={s.id} role="alert" className="flex gap-3 rounded-lg bg-danger-soft px-4 py-3">
          <Icon name="alert" className="mt-0.5 shrink-0 text-danger" />
          <div className="text-sm">
            <p className="font-semibold text-danger">Duplicate submission blocked</p>
            <p className="mt-0.5 text-foreground">{s.block!.detail}</p>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-control w-full items-center gap-2 rounded-lg bg-card px-3 shadow-card focus-within:ring-2 focus-within:ring-ring sm:max-w-xs">
          <Icon name="search" className="text-muted-foreground" />
          <span className="sr-only">Search submittals</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Candidate, job or client"
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SubmittalStatus | 'all')}
            className={selectClass}
          >
            <option value="all">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Client</span>
          <select
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className={selectClass}
          >
            <option value="all">Any</option>
            {clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-muted-foreground sm:ml-auto" aria-live="polite">
          <span className="font-semibold tabular-nums text-foreground">{rows.length}</span> of{' '}
          <span className="tabular-nums">{submittals.length}</span> submittals
        </p>
      </div>

      <section aria-label="Submittals" className="overflow-x-auto rounded-xl bg-card shadow-card">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No submittals match.{' '}
            {filtered ? (
              <button
                type="button"
                className="inline-flex min-h-target items-center font-semibold text-foreground underline"
                onClick={() => {
                  setQuery('');
                  setStatus('all');
                  setClient('all');
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <table className="w-full min-w-[820px] text-sm">
            <caption className="sr-only">
              Submittals, people who need you first. Follow-up due means the client has been silent
              for more than {FOLLOW_UP_BUSINESS_DAYS} business days.
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-caption text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Candidate
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Job
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Client and channel
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Bill rate
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Latest
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Owner
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((s) => {
                const needsYou = NEEDS_YOU.includes(s.status);
                const due = followUpDue(s, at);
                return (
                  <tr key={s.id} className={cn(needsYou && 'bg-muted/40')}>
                    <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-medium">
                      {needsYou ? (
                        <Link
                          href="/recruiter/review"
                          className="inline-flex min-h-target items-center gap-1 underline decoration-border underline-offset-4 hover:decoration-foreground"
                        >
                          {s.candidate}
                          <span className="sr-only">, review and decide</span>
                        </Link>
                      ) : (
                        s.candidate
                      )}
                    </th>
                    <td className="px-3 py-3">{s.job}</td>
                    <td className="px-3 py-3">
                      {s.client}
                      <span className="text-muted-foreground">, {s.channel}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'rounded-sm px-2 py-0.5 text-caption font-semibold',
                            STATUS_TONE[s.status],
                          )}
                        >
                          {STATUS_LABEL[s.status]}
                        </span>
                        {due ? (
                          <span className="rounded-sm bg-warning-soft px-2 py-0.5 text-caption font-semibold text-warning">
                            Follow-up due
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td
                      className={cn(
                        'px-3 py-3 text-right tabular-nums',
                        s.billRate === undefined && 'text-muted-foreground',
                      )}
                    >
                      {formatBillRate(s.billRate)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {s.block?.kind === 'margin' ? s.block.detail : s.latest}
                      {due ? (
                        <span className="block text-caption">
                          Silent {clientSilence(s, at)} business days
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{s.owner}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <p className="text-caption text-muted-foreground">
        Waiting for you and Blocked open the Review queue, where you approve, edit or override with
        a reason. A follow-up flag only suggests a nudge; the Outreach agent drafts it there for
        your approval.
      </p>
    </div>
  );
}
