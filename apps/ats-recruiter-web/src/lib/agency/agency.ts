/** Agency view: the firm's view across recruiter desks. Read-only. */

export interface Desk {
  id: string;
  name: string;
  focus: string;
  roles: number;
  submittals: number;
  interviews: number;
  starts: number;
  /** Proposals waiting in this desk's Review queue. */
  queue: number;
  newClients: number;
}

export type NumberKey = 'roles' | 'submittals' | 'interviews' | 'starts' | 'queue' | 'newClients';

export const QUEUE_WARNING = 10;
export const QUEUE_BEHIND = 20;

export type QueueTone = 'success' | 'warning' | 'danger';

export function queueState(n: number): { tone: QueueTone; text: string } {
  if (n > QUEUE_BEHIND) return { tone: 'danger', text: `${n} waiting, behind` };
  if (n > QUEUE_WARNING) return { tone: 'warning', text: `${n} waiting` };
  return { tone: 'success', text: `${n} waiting` };
}

export function deskTotals(desks: readonly Desk[]): Record<NumberKey, number> & { behind: number } {
  const sum = (k: NumberKey) => desks.reduce((t, d) => t + d[k], 0);
  return {
    roles: sum('roles'),
    submittals: sum('submittals'),
    interviews: sum('interviews'),
    starts: sum('starts'),
    queue: sum('queue'),
    newClients: sum('newClients'),
    behind: desks.filter((d) => d.queue > QUEUE_BEHIND).length,
  };
}

/** Sort by a number column; name breaks ties so the order is stable. */
export function sortDesks(
  desks: readonly Desk[],
  key: NumberKey | 'name',
  dir: 'asc' | 'desc',
): Desk[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...desks].sort((a, b) => {
    const c = key === 'name' ? a.name.localeCompare(b.name) : a[key] - b[key];
    return c * sign || a.name.localeCompare(b.name);
  });
}

export type Decider = 'agent' | 'recruiter' | 'manager';

export const DECIDER_LABEL: Record<Decider, string> = {
  agent: 'Agent runs it, logged',
  recruiter: 'Recruiter approves',
  manager: 'Manager approves',
};

export interface PolicyRow {
  what: string;
  decider: Decider;
  note?: string;
}

export type ManagerItemKind = 'territory' | 'duplicate' | 'credential' | 'compliance';

export interface ManagerItem {
  id: string;
  kind: ManagerItemKind;
  title: string;
  detail: string;
  href: string;
  /** YYYY-MM-DD the item must be handled by, when there is one. */
  dueOn?: string;
  /** Needs a decision before work on a desk can go on. */
  blocking: boolean;
}

/** Blocking items first, then the nearest due date; items with no date last. */
export function sortManagerItems(items: readonly ManagerItem[]): ManagerItem[] {
  return [...items].sort(
    (a, b) =>
      Number(b.blocking) - Number(a.blocking) ||
      (a.dueOn ?? '9999-12-31').localeCompare(b.dueOn ?? '9999-12-31') ||
      a.id.localeCompare(b.id),
  );
}

/** Whole days from `today` to `day`, both YYYY-MM-DD. */
export function daysUntil(day: string, today: string): number {
  return Math.round(
    (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
}

export function dueLabel(day: string, today: string): string {
  const n = daysUntil(day, today);
  if (n < 0) return `Overdue by ${-n} ${-n === 1 ? 'day' : 'days'}`;
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  return `Due in ${n} days`;
}
