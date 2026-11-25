'use client';

import { useState } from 'react';
import { Button, cn } from '@jobocate/ui';

import {
  CAPABILITY_LABEL,
  capabilityState,
  formatCost,
  formatRunTime,
  runTotals,
  runsFor,
  withoutAsking,
  type Agent,
  type AgentRun,
  type AgentState,
  type Capability,
  type FirmPolicy,
} from '../../lib/agents/agents';

const SCHEDULES = [
  'Nightly 2:00 AM',
  'Daily 5:00 AM',
  'Daily 6:00 AM',
  'Twice daily',
  'On request',
];

const selectClass =
  'h-control w-full rounded-lg bg-card px-3 text-sm shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function AgentsBoard({
  agents,
  runs,
  policy,
  enabled: initialEnabled,
  now,
  timeZone,
  representative,
}: {
  agents: Agent[];
  runs: AgentRun[];
  policy: FirmPolicy;
  enabled: Capability[];
  /** ISO time the page was rendered, so server and client agree. */
  now: string;
  timeZone: string;
  representative: boolean;
}) {
  const [selectedId, setSelectedId] = useState(
    agents.find((a) => a.capability === 'shortlist')?.id ?? agents[0]?.id,
  );
  const [enabled, setEnabled] = useState(initialEnabled);
  const [states, setStates] = useState<Record<string, AgentState>>(() =>
    Object.fromEntries(agents.map((a) => [a.id, a.state])),
  );
  const [schedules, setSchedules] = useState<Record<string, string>>(() =>
    Object.fromEntries(agents.map((a) => [a.id, a.schedule])),
  );
  const [announce, setAnnounce] = useState('');

  const agent = agents.find((a) => a.id === selectedId);
  if (!agent) return <p className="text-sm text-muted-foreground">No agents on your desk.</p>;

  const at = new Date(now);
  const own = runsFor(runs, agent.id);
  const totals = runTotals(own);
  const capState = agent.capability ? capabilityState(agent.capability, policy) : null;
  const autoOn = agent.capability ? enabled.includes(agent.capability) : false;
  const paused = states[agent.id] === 'paused';
  const scheduleOptions = SCHEDULES.includes(schedules[agent.id]!)
    ? SCHEDULES
    : [schedules[agent.id]!, ...SCHEDULES];

  const setAuto = (on: boolean) => {
    if (!agent.capability || capState?.kind !== 'open') return;
    const cap = agent.capability;
    setEnabled((prev) => (on ? [...new Set([...prev, cap])] : prev.filter((c) => c !== cap)));
  };

  return (
    <div className="flex flex-col gap-5">
      {representative ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Representative data. The agent run log and firm settings are not connected yet, so these
          agents and runs are samples and changes here are not stored.
        </p>
      ) : null}

      <section aria-label="Your agents" className="overflow-x-auto rounded-xl bg-card shadow-card">
        <table className="w-full min-w-[860px] text-sm">
          <caption className="sr-only">
            Your agents, what each does, when it runs and what it may do without asking.
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-caption text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-semibold">
                Agent
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                What it does
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Runs
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Last run
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Without asking
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                State
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agents.map((a) => {
              const selected = a.id === agent.id;
              const isPaused = states[a.id] === 'paused';
              return (
                <tr key={a.id} className={cn(selected && 'bg-muted')}>
                  <th scope="row" className="px-4 py-2 text-left font-medium">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setSelectedId(a.id);
                        setAnnounce('');
                      }}
                      className="min-h-target rounded-md text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {a.name}
                    </button>
                  </th>
                  <td className="px-3 py-2">{a.job}</td>
                  <td className="whitespace-nowrap px-3 py-2">{schedules[a.id]}</td>
                  <td className="px-3 py-2">{a.lastRun}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {withoutAsking(a, enabled, policy)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        'rounded-sm px-2 py-0.5 text-caption font-semibold',
                        isPaused ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success',
                      )}
                    >
                      {isPaused ? 'Paused' : 'Running'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="runs-title"
          className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
        >
          <div>
            <h2 id="runs-title" className="font-display text-[22px] leading-7">
              {agent.name} runs
            </h2>
            <p className="text-caption text-muted-foreground">
              Inputs, outputs and cost for every run, kept in the activity log.
              {own.length
                ? ` ${totals.count} recent, ${formatCost(totals.costCents)} in all${
                    totals.failed ? `, ${totals.failed} failed` : ''
                  }.`
                : ''}
            </p>
          </div>
          {own.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <caption className="sr-only">Recent runs of the {agent.name}.</caption>
                <thead>
                  <tr className="border-b border-border text-left text-caption text-muted-foreground">
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Run
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Input
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Output
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Cost
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {own.map((r) => (
                    <tr key={r.id}>
                      <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium">
                        {formatRunTime(r.at, at, timeZone)}
                      </th>
                      <td className="px-3 py-2">{r.input}</td>
                      <td className={cn('px-3 py-2', r.failed && 'font-semibold text-danger')}>
                        {r.output}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCost(r.costCents)}
                      </td>
                      <td className="px-3 py-2">{r.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No runs recorded in the last week.</p>
          )}
        </section>

        <section
          aria-labelledby="agent-settings-title"
          className="flex min-w-0 flex-col gap-4 rounded-xl bg-card p-5 shadow-card sm:p-6"
        >
          <h2 id="agent-settings-title" className="font-display text-[22px] leading-7">
            {agent.name} settings
          </h2>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Without asking</legend>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="autonomy"
                className="mt-1"
                checked={!autoOn || capState?.kind !== 'open'}
                onChange={() => setAuto(false)}
              />
              <span>Draft only: every proposal waits in your Review queue</span>
            </label>
            {agent.capability ? (
              <label
                className={cn(
                  'flex items-start gap-2 text-sm',
                  capState?.kind !== 'open' && 'text-muted-foreground',
                )}
              >
                <input
                  type="radio"
                  name="autonomy"
                  className="mt-1"
                  checked={autoOn && capState?.kind === 'open'}
                  disabled={capState?.kind !== 'open'}
                  aria-describedby="autonomy-hint"
                  onChange={() => setAuto(true)}
                />
                <span>
                  {CAPABILITY_LABEL[agent.capability]}
                  <span id="autonomy-hint" className="block text-caption text-muted-foreground">
                    {capState?.kind === 'open'
                      ? 'Allowed by your firm. Everything it does still shows in the activity log.'
                      : capState?.reason}
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-caption text-muted-foreground">
                This agent only drafts. Nothing it makes goes out without you.
              </p>
            )}
          </fieldset>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Schedule</span>
            <select
              value={schedules[agent.id]}
              onChange={(e) => setSchedules((s) => ({ ...s, [agent.id]: e.target.value }))}
              className={selectClass}
            >
              {scheduleOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              className="min-h-target"
              onClick={() => {
                setStates((s) => ({ ...s, [agent.id]: paused ? 'running' : 'paused' }));
                setAnnounce(
                  paused
                    ? `${agent.name} resumed.`
                    : `${agent.name} paused. It will not run until you resume it.`,
                );
              }}
            >
              {paused ? 'Resume agent' : 'Pause agent'}
            </Button>
            <Button
              className="min-h-target"
              onClick={() =>
                setAnnounce('Saved for this visit. Agent settings are not stored yet.')
              }
            >
              Save
            </Button>
          </div>
          <p role="status" className="min-h-5 text-caption text-muted-foreground">
            {announce}
          </p>
        </section>
      </div>
    </div>
  );
}
