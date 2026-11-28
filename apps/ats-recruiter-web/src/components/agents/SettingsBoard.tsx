'use client';

import { useState, type ReactNode } from 'react';
import { Button, cn } from '@jobocate/ui';

import {
  CAPABILITY_LABEL,
  capOptions,
  capabilityState,
  disconnected,
  formatSync,
  outOfOfficeError,
  sortConnections,
  type Capability,
  type Connection,
  type ConnectionStatus,
  type FirmPolicy,
} from '../../lib/agents/agents';

const STATUS: Record<ConnectionStatus, { label: string; tone: string }> = {
  disconnected: { label: 'Disconnected', tone: 'bg-danger-soft text-danger' },
  'tasks-only': { label: 'Tasks only', tone: 'bg-info-soft text-info' },
  connected: { label: 'Connected', tone: 'bg-success-soft text-success' },
};

/** The permissions shown on this page, in this order. */
const PERMISSIONS: { cap: Capability; hint: string }[] = [
  { cap: 'interview-reminders', hint: 'Only to candidates who already confirmed the time.' },
  {
    cap: 'timesheet-reminders',
    hint: 'Timesheets live in your back office; Insyght only reminds.',
  },
  { cap: 'shortlist', hint: 'Matches still need you before anyone is contacted.' },
  { cap: 'first-outreach', hint: '' },
  { cap: 'decline-applicants', hint: '' },
  { cap: 'advance-candidates', hint: '' },
];

const control =
  'h-control w-full rounded-lg bg-card px-3 text-sm shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Panel({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-4 rounded-xl bg-card p-5 shadow-card sm:p-6"
    >
      <div>
        <h2 id={id} className="font-display text-[22px] leading-7">
          {title}
        </h2>
        {hint ? <p className="text-caption text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsBoard({
  connections,
  policy,
  enabled: initialEnabled,
  mailboxes,
  colleagues,
  firmSendingMax,
  marginFloor,
  now,
  today,
  timeZone,
  representative,
}: {
  connections: Connection[];
  policy: FirmPolicy;
  enabled: Capability[];
  mailboxes: { id: string; label: string }[];
  colleagues: { id: string; label: string }[];
  firmSendingMax: number;
  /** Firm margin floor, 0 to 1. */
  marginFloor: number;
  /** ISO time the page was rendered, so server and client agree. */
  now: string;
  /** YYYY-MM-DD in the firm's time zone. */
  today: string;
  timeZone: string;
  representative: boolean;
}) {
  const rows = sortConnections(connections);
  const down = disconnected(connections);
  const caps = capOptions(firmSendingMax);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [mailbox, setMailbox] = useState(mailboxes[0]?.id ?? '');
  const [cap, setCap] = useState(String(caps.includes(60) ? 60 : (caps[0] ?? '')));
  const [ooo, setOoo] = useState({ from: '', until: '', coverId: '' });
  const [status, setStatus] = useState('');
  const oooError = outOfOfficeError(ooo, today);
  const at = new Date(now);

  const save = () => {
    if (oooError) {
      setStatus(`Not saved. ${oooError}`);
      return;
    }
    setStatus('Saved for this visit. Settings are not stored until firm settings are connected.');
  };

  return (
    <div className="flex flex-col gap-5">
      {representative ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Representative data. Connections and firm settings are not connected yet, so these are
          samples and changes here are not stored.
        </p>
      ) : null}

      {down.map((c) => (
        <div
          key={c.id}
          role="alert"
          className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <p className="font-semibold">
            {c.name} disconnected · {formatSync(c.since, at, timeZone)}
          </p>
          {c.held ? <p>{c.held}</p> : null}
        </div>
      ))}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel id="connections-title" title="Connections">
            <ul className="divide-y divide-border">
              {rows.map((c) => (
                <li
                  key={c.id}
                  className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_10rem] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-caption text-muted-foreground">{c.use}</p>
                  </div>
                  <span
                    className={cn(
                      'w-fit rounded-sm px-2 py-0.5 text-caption font-semibold',
                      STATUS[c.status].tone,
                    )}
                  >
                    {STATUS[c.status].label}
                  </span>
                  <span className="text-caption text-muted-foreground sm:text-right">
                    {c.status === 'disconnected' ? 'Since ' : 'Synced '}
                    {formatSync(c.since, at, timeZone)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            id="permissions-title"
            title="What agents may do without asking"
            hint="Your firm sets the limits and you choose inside them. Anything done without asking still shows in the activity log."
          >
            <div className="flex flex-col gap-3">
              {PERMISSIONS.map(({ cap: c, hint }) => {
                const state = capabilityState(c, policy);
                const open = state.kind === 'open';
                const id = `perm-${c}`;
                return (
                  <label
                    key={c}
                    htmlFor={id}
                    className={cn(
                      'flex items-start gap-3 text-sm',
                      !open && 'text-muted-foreground',
                    )}
                  >
                    <input
                      id={id}
                      type="checkbox"
                      className="mt-1 size-4"
                      checked={open && enabled.includes(c)}
                      disabled={!open}
                      aria-describedby={`${id}-hint`}
                      onChange={(e) =>
                        setEnabled((prev) =>
                          e.target.checked
                            ? [...new Set([...prev, c])]
                            : prev.filter((x) => x !== c),
                        )
                      }
                    />
                    <span>
                      {CAPABILITY_LABEL[c]}
                      <span id={`${id}-hint`} className="block text-caption text-muted-foreground">
                        {open ? hint : state.reason}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel id="sending-title" title="Sending">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Send messages from</span>
              <select
                value={mailbox}
                onChange={(e) => setMailbox(e.target.value)}
                className={control}
              >
                {mailboxes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="text-caption text-muted-foreground">
                Candidates reply to this address.
              </span>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Daily sending cap</span>
              <select value={cap} onChange={(e) => setCap(e.target.value)} className={control}>
                {caps.map((n) => (
                  <option key={n} value={n}>
                    {n} a day
                  </option>
                ))}
              </select>
              <span className="text-caption text-muted-foreground">
                Your firm allows up to {firmSendingMax}. Keeps your mailbox in good standing.
              </span>
            </label>
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Margin floor</span>
              <p className="tabular-nums">{Math.round(marginFloor * 100)}%</p>
              <span className="text-caption text-muted-foreground">
                Set by your manager. Jobs under it are blocked until you override with a reason.
              </span>
            </div>
          </Panel>

          <Panel
            id="ooo-title"
            title="Out of office"
            hint="Agents hold new outreach and tell clients who covers your desk."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold">First day away</span>
                <input
                  type="date"
                  min={today}
                  value={ooo.from}
                  onChange={(e) => setOoo((o) => ({ ...o, from: e.target.value }))}
                  className={control}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold">Last day away</span>
                <input
                  type="date"
                  min={ooo.from || today}
                  value={ooo.until}
                  onChange={(e) => setOoo((o) => ({ ...o, until: e.target.value }))}
                  className={control}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Covering recruiter</span>
              <select
                value={ooo.coverId}
                onChange={(e) => setOoo((o) => ({ ...o, coverId: e.target.value }))}
                className={control}
              >
                <option value="">Choose a colleague</option>
                {colleagues.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            {oooError && (ooo.from || ooo.until) ? (
              <p className="text-caption text-danger">{oooError}</p>
            ) : null}
          </Panel>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="ghost"
              className="min-h-target"
              onClick={() => {
                setEnabled(initialEnabled);
                setMailbox(mailboxes[0]?.id ?? '');
                setCap(String(caps.includes(60) ? 60 : (caps[0] ?? '')));
                setOoo({ from: '', until: '', coverId: '' });
                setStatus('Changes discarded.');
              }}
            >
              Discard changes
            </Button>
            <Button size="lg" className="min-h-target" onClick={save}>
              Save settings
            </Button>
          </div>
          <p role="status" className="min-h-5 text-right text-caption text-muted-foreground">
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}
