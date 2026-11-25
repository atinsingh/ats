/**
 * Agent and settings logic: what agents may do without asking inside the firm's AI policy, agent
 * run history, connections and out of office. Pure and unit-tested (test/agents.test.ts).
 */

/** Things an agent could do without a person approving each one. */
export type Capability =
  | 'shortlist'
  | 'interview-reminders'
  | 'timesheet-reminders'
  | 'first-outreach'
  | 'decline-applicants'
  | 'advance-candidates';

export const CAPABILITY_LABEL: Record<Capability, string> = {
  shortlist: 'Add matches to a shortlist',
  'interview-reminders': 'Send interview reminders',
  'timesheet-reminders': 'Remind contractors about missing timesheets',
  'first-outreach': 'Send first outreach',
  'decline-applicants': 'Decline applicants',
  'advance-candidates': 'Advance candidates to the next stage',
};

/** Short form for the agents table when the capability is switched on. */
const CAPABILITY_ON: Record<Capability, string> = {
  shortlist: 'Adds to shortlist',
  'interview-reminders': 'Reminders auto',
  'timesheet-reminders': 'Reminders auto',
  'first-outreach': 'Sends first outreach',
  'decline-applicants': 'Declines',
  'advance-candidates': 'Advances',
};

/**
 * Platform rule, not a setting: AI never rejects or advances a candidate on its own. No firm
 * policy can open these.
 */
export const ALWAYS_A_PERSON: readonly Capability[] = ['decline-applicants', 'advance-candidates'];

/** The firm's AI policy. A capability the policy does not mention needs approval every time. */
export type FirmPolicy = Partial<Record<Capability, 'allowed' | 'approval'>>;

export type CapabilityState =
  | { kind: 'open' }
  | { kind: 'firm-locked'; reason: string }
  | { kind: 'never'; reason: string };

export function capabilityState(cap: Capability, policy: FirmPolicy): CapabilityState {
  if (ALWAYS_A_PERSON.includes(cap))
    return { kind: 'never', reason: 'Never available. A person decides every one.' };
  if (policy[cap] === 'allowed') return { kind: 'open' };
  return { kind: 'firm-locked', reason: 'Locked by your firm: it always needs your approval.' };
}

/** Keeps only the capabilities the policy lets the recruiter switch on, without duplicates. */
export function clampToPolicy(chosen: readonly Capability[], policy: FirmPolicy): Capability[] {
  return [...new Set(chosen)].filter((c) => capabilityState(c, policy).kind === 'open');
}

export type AgentState = 'running' | 'paused';

export interface Agent {
  id: string;
  name: string;
  job: string;
  schedule: string;
  /** Summary of the last run, e.g. "18 new matches". */
  lastRun: string;
  /** The one thing this agent could do without asking, if any. */
  capability?: Capability;
  state: AgentState;
}

/** What the agent does without asking, given what the recruiter switched on and the policy. */
export function withoutAsking(
  agent: Agent,
  enabled: readonly Capability[],
  policy: FirmPolicy,
): string {
  if (!agent.capability) return 'Drafts only';
  if (capabilityState(agent.capability, policy).kind !== 'open') return 'Drafts only, locked';
  return clampToPolicy(enabled, policy).includes(agent.capability)
    ? CAPABILITY_ON[agent.capability]
    : 'Drafts only';
}

export interface AgentRun {
  id: string;
  agentId: string;
  /** ISO start time. */
  at: string;
  input: string;
  output: string;
  costCents: number;
  result: string;
  failed?: boolean;
}

/** One agent's runs, newest first. */
export function runsFor(runs: readonly AgentRun[], agentId: string): AgentRun[] {
  return runs.filter((r) => r.agentId === agentId).sort((a, b) => b.at.localeCompare(a.at));
}

export function runTotals(runs: readonly AgentRun[]) {
  return {
    count: runs.length,
    failed: runs.filter((r) => r.failed).length,
    costCents: runs.reduce((sum, r) => sum + r.costCents, 0),
  };
}

export const formatCost = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const dayIn = (d: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(d)
    .slice(0, 10);

/** "Today 2:00 AM", "Yesterday 2:00 AM" or "Nov 22 2:00 AM", in the firm's time zone. */
export function formatRunTime(iso: string, now: Date, timeZone: string): string {
  const at = new Date(iso);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(at);
  const day = dayIn(at, timeZone);
  if (day === dayIn(now, timeZone)) return `Today ${time}`;
  if (day === dayIn(new Date(now.getTime() - 86_400_000), timeZone)) return `Yesterday ${time}`;
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
  }).format(at);
  return `${date} ${time}`;
}

export type ConnectionStatus = 'disconnected' | 'tasks-only' | 'connected';

export interface Connection {
  id: string;
  name: string;
  use: string;
  status: ConnectionStatus;
  /** ISO time of the last sync, or when it disconnected. */
  since: string;
  /** What is waiting because of a disconnection, e.g. "2 approved timesheets". */
  held?: string;
}

const STATUS_ORDER: Record<ConnectionStatus, number> = {
  disconnected: 0,
  'tasks-only': 1,
  connected: 2,
};

/** Disconnected first, then task-only connections, then by name. */
export function sortConnections(rows: readonly Connection[]): Connection[] {
  return [...rows].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name),
  );
}

export const disconnected = (rows: readonly Connection[]) =>
  rows.filter((c) => c.status === 'disconnected');

/** Daily sending caps the recruiter can pick, never above the firm's limit. */
export const capOptions = (firmMax: number, steps: readonly number[] = [40, 60, 80, 100]) =>
  steps.filter((n) => n <= firmMax);

export interface OutOfOffice {
  /** YYYY-MM-DD, or empty when not set. */
  from: string;
  until: string;
  coverId: string;
}

/** Why the out-of-office dates can't be saved, or null when they can. */
export function outOfOfficeError(o: OutOfOffice, today: string): string | null {
  if (!o.from && !o.until) return null;
  if (!o.from || !o.until) return 'Choose both a first and a last day.';
  if (o.until < o.from) return 'The last day is before the first day.';
  if (o.until < today) return 'Those dates are in the past.';
  if (!o.coverId) return 'Choose who covers your desk while you are away.';
  return null;
}

/** "Just now", "12 min ago", or else the run-time form ("Today 3:12 AM"). */
export function formatSync(iso: string, now: Date, timeZone: string): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  return formatRunTime(iso, now, timeZone);
}
