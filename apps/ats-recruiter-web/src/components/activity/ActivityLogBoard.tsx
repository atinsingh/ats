'use client';

import { useState } from 'react';
import { Button, cn } from '@jobocate/ui';

import {
  ACTOR_LABEL,
  CSV_HEADER,
  TYPE_FILTERS,
  TYPE_LABEL,
  approvalNote,
  csvRows,
  filterEvents,
  formatEventTime,
  pageOf,
  type ActivityEvent,
  type ActorKind,
  type TypeFilter,
} from '../../lib/activity/activity';
import { toCsv } from '../../lib/reports/reports';

const control =
  'h-control w-full rounded-lg bg-card px-3 text-sm shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring';

const ACTOR_TONE: Record<ActorKind, string> = {
  person: 'bg-muted text-foreground',
  agent: 'bg-info-soft text-info',
  system: 'bg-muted text-muted-foreground',
};

export function ActivityLogBoard({
  events,
  now,
  timeZone,
  representative,
}: {
  events: ActivityEvent[];
  /** ISO time the page was rendered, so server and client agree. */
  now: string;
  timeZone: string;
  representative: boolean;
}) {
  const [actor, setActor] = useState<ActorKind | 'all'>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const at = new Date(now);

  const rows = filterEvents(events, { actor, type, query });
  const view = pageOf(rows, page);
  const reset = () => setPage(1);

  const exportCsv = () => {
    const csv = toCsv(CSV_HEADER, csvRows(rows));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${now.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`Exported ${rows.length} ${rows.length === 1 ? 'event' : 'events'}.`);
  };

  return (
    <div className="flex flex-col gap-5">
      {representative ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Representative data. The audit service is not connected yet, so these events are samples.
          The log is read-only: nothing here can be edited or deleted.
        </p>
      ) : null}

      <section
        aria-labelledby="activity-title"
        className="flex min-w-0 flex-col gap-4 rounded-xl bg-card p-5 shadow-card sm:p-6"
      >
        <h2 id="activity-title" className="sr-only">
          Events
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[12rem_16rem_minmax(0,1fr)_auto] lg:items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Who</span>
            <select
              value={actor}
              onChange={(e) => {
                setActor(e.target.value as ActorKind | 'all');
                reset();
              }}
              className={control}
            >
              <option value="all">Everyone</option>
              {(Object.keys(ACTOR_LABEL) as ActorKind[]).map((k) => (
                <option key={k} value={k}>
                  {ACTOR_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Event</span>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as TypeFilter);
                reset();
              }}
              className={control}
            >
              {TYPE_FILTERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Search</span>
            <input
              type="search"
              value={query}
              placeholder="Name, candidate, job or reason"
              onChange={(e) => {
                setQuery(e.target.value);
                reset();
              }}
              className={control}
            />
          </label>
          <Button
            variant="outline"
            className="min-h-target"
            disabled={!rows.length}
            onClick={exportCsv}
          >
            Export CSV
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-caption text-muted-foreground">
            {rows.length
              ? `${rows.length} ${rows.length === 1 ? 'event' : 'events'}, showing ${view.from} to ${view.to}.`
              : 'No events match.'}{' '}
            {status}
          </p>
        </div>

        {view.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Activity, newest first.</caption>
              <thead>
                <tr className="border-b border-border text-left text-caption text-muted-foreground">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    When
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Who
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    What happened
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Event
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {view.rows.map((e) => {
                  const approval = approvalNote(e);
                  const override = e.type === 'override';
                  return (
                    <tr key={e.id} className={cn(override && 'bg-warning-soft')}>
                      <th
                        scope="row"
                        className="whitespace-nowrap px-3 py-2 text-left align-top font-medium tabular-nums"
                      >
                        {formatEventTime(e.at, at, timeZone)}
                      </th>
                      <td className="whitespace-nowrap px-3 py-2 align-top">
                        <span className="block">{e.actor}</span>
                        <span
                          className={cn(
                            'mt-0.5 inline-block rounded-sm px-1.5 py-0.5 text-caption font-semibold',
                            ACTOR_TONE[e.actorKind],
                          )}
                        >
                          {e.actorKind === 'person'
                            ? 'Person'
                            : e.actorKind === 'agent'
                              ? 'Agent'
                              : 'System'}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className={cn('block', e.failed && 'font-semibold text-danger')}>
                          {e.action}
                        </span>
                        <span className="block text-caption text-muted-foreground">
                          {e.subject}
                        </span>
                        {override && e.reason ? (
                          <span className="block text-caption font-semibold text-warning">
                            Reason given: {e.reason}
                          </span>
                        ) : null}
                        {approval ? (
                          <span
                            className={cn(
                              'block text-caption',
                              e.approvedBy ? 'text-muted-foreground' : 'font-semibold text-info',
                            )}
                          >
                            {approval}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-top">
                        {TYPE_LABEL[e.type]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Try another filter, or clear the search.</p>
        )}

        {view.pages > 1 ? (
          <nav aria-label="Pages" className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="min-h-target"
              disabled={view.page <= 1}
              onClick={() => setPage(view.page - 1)}
            >
              Newer
            </Button>
            <span className="text-caption text-muted-foreground tabular-nums">
              Page {view.page} of {view.pages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-target"
              disabled={view.page >= view.pages}
              onClick={() => setPage(view.page + 1)}
            >
              Older
            </Button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
