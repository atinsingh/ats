'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@jobocate/ui';

import {
  DECIDER_LABEL,
  QUEUE_BEHIND,
  QUEUE_WARNING,
  deskTotals,
  dueLabel,
  queueState,
  sortDesks,
  sortManagerItems,
  type Decider,
  type Desk,
  type ManagerItem,
  type NumberKey,
  type PolicyRow,
  type QueueTone,
} from '../../lib/agency/agency';

const COLUMNS: { key: NumberKey; label: string }[] = [
  { key: 'roles', label: 'Open roles' },
  { key: 'submittals', label: 'Submittals' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'starts', label: 'Starts' },
  { key: 'queue', label: 'Queue waiting' },
  { key: 'newClients', label: 'New clients' },
];

const QUEUE_TONE: Record<QueueTone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

const DECIDER_TONE: Record<Decider, string> = {
  agent: 'bg-info-soft text-info',
  recruiter: 'bg-muted text-foreground',
  manager: 'bg-warning-soft text-warning',
};

export function AgencyBoard({
  desks,
  policy,
  items,
  today,
  representative,
  liveNote,
  policyNote,
}: {
  desks: Desk[];
  policy: PolicyRow[];
  items: ManagerItem[];
  /** YYYY-MM-DD in the firm's time zone. */
  today: string;
  representative: boolean;
  /** Shown when the desks are live, to say what is and isn't tracked. */
  liveNote?: string;
  /** Shown above the policy when it is still a sample. */
  policyNote?: string;
}) {
  const [sort, setSort] = useState<{ key: NumberKey | 'name'; dir: 'asc' | 'desc' }>({
    key: 'name',
    dir: 'asc',
  });
  const rows = sortDesks(desks, sort.key, sort.dir);
  const totals = deskTotals(desks);
  const needs = sortManagerItems(items);

  const sortBy = (key: NumberKey | 'name') =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' },
    );
  const ariaSort = (key: NumberKey | 'name') =>
    sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  const header = (key: NumberKey | 'name', label: string, right: boolean) => (
    <th
      key={key}
      scope="col"
      aria-sort={ariaSort(key)}
      className={cn('px-3 py-2 font-semibold', right && 'text-right')}
    >
      <button
        type="button"
        onClick={() => sortBy(key)}
        className="min-h-target rounded-md underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <span aria-hidden="true">{sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</span>
      </button>
    </th>
  );

  return (
    <div className="flex flex-col gap-5">
      {representative ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Representative data. Desk metrics and manager roles are not connected yet, so these desks
          are samples. Nothing on this page acts on a candidate.
        </p>
      ) : liveNote ? (
        <p role="note" className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          {liveNote}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Open roles', value: totals.roles },
          { label: 'Submittals this week', value: totals.submittals },
          { label: 'Starts this week', value: totals.starts },
          {
            label: 'Waiting in Review queues',
            value: totals.queue,
            note: totals.behind
              ? `${totals.behind} ${totals.behind === 1 ? 'desk' : 'desks'} behind`
              : 'Every desk on track',
          },
        ].map((t) => (
          <div key={t.label} className="rounded-xl bg-card p-4 shadow-card">
            <p className="text-caption text-muted-foreground">{t.label}</p>
            <p className="mt-1 font-display text-[28px] leading-9 tabular-nums">{t.value}</p>
            {t.note ? (
              <p
                className={cn(
                  'text-caption',
                  totals.behind ? 'font-semibold text-danger' : 'text-muted-foreground',
                )}
              >
                {t.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <section
        aria-labelledby="desks-title"
        className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
      >
        <div>
          <h2 id="desks-title" className="font-display text-[22px] leading-7">
            Desks this week
          </h2>
          <p className="text-caption text-muted-foreground">
            Every recruiter runs a full desk with their own agents. Over {QUEUE_WARNING} waiting is
            a warning; over {QUEUE_BEHIND} means the desk is behind.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <caption className="sr-only">Desks this week. Column headers sort the table.</caption>
            <thead>
              <tr className="border-b border-border text-left text-caption text-muted-foreground">
                {header('name', 'Recruiter', false)}
                <th scope="col" className="px-3 py-2 font-semibold">
                  Focus
                </th>
                {COLUMNS.map((c) => header(c.key, c.label, c.key !== 'queue'))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((d) => {
                const q = queueState(d.queue);
                return (
                  <tr key={d.id}>
                    <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium">
                      {d.name}
                    </th>
                    <td className="px-3 py-2 text-muted-foreground">{d.focus || '–'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.roles}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.submittals}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.interviews}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.starts}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={cn(
                          'rounded-sm px-2 py-0.5 text-caption font-semibold tabular-nums',
                          QUEUE_TONE[q.tone],
                        )}
                      >
                        {q.text}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.newClients}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-semibold">
                <th scope="row" className="px-3 py-2 text-left">
                  Firm
                </th>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right tabular-nums">{totals.roles}</td>
                <td className="px-3 py-2 text-right tabular-nums">{totals.submittals}</td>
                <td className="px-3 py-2 text-right tabular-nums">{totals.interviews}</td>
                <td className="px-3 py-2 text-right tabular-nums">{totals.starts}</td>
                <td className="px-3 py-2 tabular-nums">{totals.queue} waiting</td>
                <td className="px-3 py-2 text-right tabular-nums">{totals.newClients}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section
          aria-labelledby="policy-title"
          className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
        >
          <div>
            <h2 id="policy-title" className="font-display text-[22px] leading-7">
              AI policy, set by the firm
            </h2>
            <p className="text-caption text-muted-foreground">
              Applies to every desk. Recruiters choose inside these limits on their Agents page.
            </p>
            {policyNote ? (
              <p role="note" className="mt-2 rounded-lg bg-info-soft px-3 py-2 text-caption text-info">
                {policyNote}
              </p>
            ) : null}
          </div>
          <ul className="divide-y divide-border">
            {policy.map((p) => (
              <li key={p.what} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <span className="min-w-0">
                  <span className="block font-medium">{p.what}</span>
                  {p.note ? (
                    <span className="block text-caption text-muted-foreground">{p.note}</span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    'rounded-sm px-2 py-0.5 text-caption font-semibold',
                    DECIDER_TONE[p.decider],
                  )}
                >
                  {DECIDER_LABEL[p.decider]}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="needs-title"
          className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
        >
          <h2 id="needs-title" className="font-display text-[22px] leading-7">
            Needs a manager
          </h2>
          {needs.length ? (
            <ul className="divide-y divide-border">
              {needs.map((m) => (
                <li key={m.id}>
                  <Link
                    href={m.href}
                    prefetch={false}
                    className="flex items-start gap-3 rounded-md py-3 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        m.blocking ? 'bg-danger' : 'bg-warning',
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {m.blocking ? <span className="sr-only">Blocking: </span> : null}
                        {m.title}
                      </span>
                      <span className="block text-caption text-muted-foreground">
                        {m.detail}
                        {m.dueOn ? ` ${dueLabel(m.dueOn, today)}.` : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing needs a manager right now.</p>
          )}
        </section>
      </div>
    </div>
  );
}
