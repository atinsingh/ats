/** Activity log: every action by people, agents and the system, read-only. */

export type ActorKind = 'person' | 'agent' | 'system';

export type EventType =
  | 'send'
  | 'approval'
  | 'override'
  | 'data-access'
  | 'settings'
  | 'connection'
  | 'draft';

export const ACTOR_LABEL: Record<ActorKind, string> = {
  person: 'People',
  agent: 'Agents',
  system: 'System',
};

/** Filter groups shown on the page. Approvals and overrides are one group. */
export type TypeFilter = 'all' | 'sends' | 'approvals' | 'data-access' | 'settings' | 'connections';

export const TYPE_FILTERS: { id: TypeFilter; label: string; types: EventType[] }[] = [
  { id: 'all', label: 'All events', types: [] },
  { id: 'sends', label: 'Sends', types: ['send'] },
  { id: 'approvals', label: 'Approvals and overrides', types: ['approval', 'override'] },
  { id: 'data-access', label: 'Data access', types: ['data-access'] },
  { id: 'settings', label: 'Settings', types: ['settings'] },
  { id: 'connections', label: 'Connections', types: ['connection'] },
];

export const TYPE_LABEL: Record<EventType, string> = {
  send: 'Send',
  approval: 'Approval',
  override: 'Override',
  'data-access': 'Data access',
  settings: 'Settings',
  connection: 'Connection',
  draft: 'Draft',
};

export interface ActivityEvent {
  id: string;
  /** ISO time. */
  at: string;
  actorKind: ActorKind;
  actor: string;
  type: EventType;
  action: string;
  /** What the action was about, such as a candidate, job or connection. */
  subject: string;
  /** Required on overrides. */
  reason?: string;
  /** Agent actions only: who approved it, or null while it waits. */
  approvedBy?: string | null;
  failed?: boolean;
}

export const PAGE_SIZE = 25;

export interface ActivityFilter {
  actor: ActorKind | 'all';
  type: TypeFilter;
  query: string;
}

export function filterEvents(events: readonly ActivityEvent[], f: ActivityFilter): ActivityEvent[] {
  const group = TYPE_FILTERS.find((t) => t.id === f.type);
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return events
    .filter((e) => f.actor === 'all' || e.actorKind === f.actor)
    .filter((e) => !group || !group.types.length || group.types.includes(e.type))
    .filter((e) => {
      if (!words.length) return true;
      const hay = [e.actor, e.action, e.subject, e.reason ?? '', e.approvedBy ?? '']
        .join(' ')
        .toLowerCase();
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
}

export function pageOf<T>(rows: readonly T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * size;
  return {
    rows: rows.slice(start, start + size),
    page: current,
    pages,
    from: rows.length ? start + 1 : 0,
    to: Math.min(start + size, rows.length),
  };
}

/** Who approved an agent action, in words. Null for people and the system. */
export function approvalNote(e: ActivityEvent): string | null {
  if (e.actorKind !== 'agent') return null;
  if (e.approvedBy === undefined) return null;
  return e.approvedBy ? `Approved by ${e.approvedBy}` : 'Waiting for approval';
}

export const CSV_HEADER = [
  'Time',
  'Actor type',
  'Actor',
  'Event',
  'Action',
  'Subject',
  'Reason',
  'Approval',
];

export function csvRows(events: readonly ActivityEvent[]): string[][] {
  return events.map((e) => [
    e.at,
    ACTOR_LABEL[e.actorKind],
    e.actor,
    TYPE_LABEL[e.type],
    e.action,
    e.subject,
    e.reason ?? '',
    approvalNote(e) ?? '',
  ]);
}

/** "Today 9:52 AM", "Yesterday 4:12 PM" or "Tue, Nov 24, 3:00 PM" in the firm's zone. */
export function formatEventTime(iso: string, now: Date, timeZone: string): string {
  const day = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  const t = new Date(iso);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(t);
  const today = day(now);
  const yesterday = day(new Date(Date.parse(`${today}T12:00:00Z`) - 86_400_000));
  const d = day(t);
  if (d === today) return `Today ${time}`;
  if (d === yesterday) return `Yesterday ${time}`;
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(t);
  return `${date}, ${time}`;
}
