'use client';

import { useMemo, useState } from 'react';
import { Icon, cn } from '@jobocate/ui';

import {
  CLIENT_STATUS_LABEL,
  MSA_WARNING_DAYS,
  QUIET_DAYS,
  attention,
  channelsOf,
  clientTotals,
  filterClients,
  formatLastContact,
  formatMoney,
  sortClients,
  type Client,
  type ClientStatus,
} from '../../lib/clients/clients';

const STATUS_TONE: Record<ClientStatus, string> = {
  active: 'bg-success-soft text-success',
  dormant: 'bg-muted text-muted-foreground',
  prospect: 'bg-info-soft text-info',
};

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

export function ClientsBoard({
  clients,
  now,
  representative,
  revenueNote,
}: {
  clients: Client[];
  /** ISO time the page was rendered, so server and client agree on ages. */
  now: string;
  representative: boolean;
  /** How revenue was worked out, when it is an estimate. */
  revenueNote?: string;
}) {
  const at = useMemo(() => new Date(now), [now]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ClientStatus | 'all'>('all');
  const [owner, setOwner] = useState<'all' | 'me'>('all');
  const [channel, setChannel] = useState('all');

  const totals = useMemo(() => clientTotals(clients, at), [clients, at]);
  const channels = useMemo(() => channelsOf(clients), [clients]);
  const rows = useMemo(
    () => sortClients(filterClients(clients, { query, status, owner, channel }), at),
    [clients, query, status, owner, channel, at],
  );
  const filtered = query.trim() !== '' || status !== 'all' || owner !== 'all' || channel !== 'all';

  return (
    <div className="flex flex-col gap-4">
      {representative ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Representative data. The client service could not be reached, so these companies are
          samples. Nothing is sent from this page.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Clients" value={String(totals.clients)} note={`${totals.active} active`} />
        <Stat label="Open jobs" value={String(totals.openJobs)} />
        <Stat
          label="Revenue, last 12 months"
          value={formatMoney(totals.revenue12m)}
          note={totals.revenue12m === null ? 'Starts with placements' : revenueNote}
        />
        <Stat
          label="Need attention"
          value={String(totals.needsAttention)}
          note="MSA ending or gone quiet"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-control w-full items-center gap-2 rounded-lg bg-card px-3 shadow-card focus-within:ring-2 focus-within:ring-ring sm:max-w-xs">
          <Icon name="search" className="text-muted-foreground" />
          <span className="sr-only">Search clients</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Client or owner"
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ClientStatus | 'all')}
            className={selectClass}
          >
            <option value="all">Any</option>
            {(Object.keys(CLIENT_STATUS_LABEL) as ClientStatus[]).map((s) => (
              <option key={s} value={s}>
                {CLIENT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Owner</span>
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value as 'all' | 'me')}
            className={selectClass}
          >
            <option value="all">Anyone</option>
            <option value="me">Me</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Submits through</span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className={selectClass}
          >
            <option value="all">Any</option>
            {channels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-muted-foreground sm:ml-auto" aria-live="polite">
          <span className="font-semibold tabular-nums text-foreground">{rows.length}</span> of{' '}
          <span className="tabular-nums">{clients.length}</span> clients
        </p>
      </div>

      <section aria-label="Clients" className="overflow-x-auto rounded-xl bg-card shadow-card">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No clients match.{' '}
            {filtered ? (
              <button
                type="button"
                className="inline-flex min-h-target items-center font-semibold text-foreground underline"
                onClick={() => {
                  setQuery('');
                  setStatus('all');
                  setOwner('all');
                  setChannel('all');
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <table className="w-full min-w-[820px] text-sm">
            <caption className="sr-only">
              Clients, those needing attention first: an MSA ending within {MSA_WARNING_DAYS} days,
              or an active client with no contact for {QUIET_DAYS} or more days.
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-caption text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Client
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Open jobs
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  {revenueNote ? 'Est. revenue, 12 months' : 'Revenue, 12 months'}
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Submits through
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Owner
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Last contact
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c) => {
                const flag = attention(c, at);
                return (
                  <tr key={c.id}>
                    <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-medium">
                      {c.name}
                    </th>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'rounded-sm px-2 py-0.5 text-caption font-semibold',
                            STATUS_TONE[c.status],
                          )}
                        >
                          {CLIENT_STATUS_LABEL[c.status]}
                        </span>
                        {flag ? (
                          <span className="rounded-sm bg-warning-soft px-2 py-0.5 text-caption font-semibold text-warning">
                            {flag}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td
                      className={cn(
                        'px-3 py-3 text-right tabular-nums',
                        !c.openJobs && 'text-muted-foreground',
                      )}
                    >
                      {c.openJobs}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-3 text-right tabular-nums',
                        c.revenue12m === undefined && 'text-muted-foreground',
                      )}
                    >
                      {formatMoney(c.revenue12m)}
                    </td>
                    <td className="px-3 py-3">{c.channel}</td>
                    <td
                      className={cn(
                        'px-3 py-3',
                        c.owner === 'Unassigned' && 'text-muted-foreground',
                      )}
                    >
                      {c.owner}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatLastContact(c.lastContactAt, at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <p className="text-caption text-muted-foreground">
        Ownership follows your territory rules, so two desks never pitch the same client. Unassigned
        clients can be claimed by any desk in their territory.
      </p>
    </div>
  );
}
