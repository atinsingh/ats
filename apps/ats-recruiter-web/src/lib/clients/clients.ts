/**
 * Clients list logic. Pure, so the rules are unit-tested (test/clients.test.ts) and the page stays
 * thin. Attention flags are plain date rules, not an AI judgement.
 */

export type ClientStatus = 'active' | 'dormant' | 'prospect';

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  active: 'Active',
  dormant: 'Dormant',
  prospect: 'Prospect',
};

export interface Client {
  id: string;
  name: string;
  status: ClientStatus;
  openJobs: number;
  /** Revenue over the last 12 months, in dollars, estimated from placements. Unset when unknown. */
  revenue12m?: number;
  /** How submittals reach them: a VMS name such as "Beeline", or "Direct". */
  channel: string;
  /** The desk that owns the client under territory rules. "You" for the viewer. */
  owner: string;
  lastContactAt?: string;
  /** When the master services agreement ends, if known. */
  msaEndsAt?: string;
}

/** An MSA ending within this many days is flagged. */
export const MSA_WARNING_DAYS = 60;
/** An active client with no contact for this many days is flagged. */
export const QUIET_DAYS = 14;

const DAY = 86_400_000;

/** Whole days from `iso` to `now`, or null when there is no date. */
export function daysSince(iso: string | undefined, now: Date): number | null {
  if (!iso) return null;
  return Math.floor((now.getTime() - Date.parse(iso)) / DAY);
}

/** Why a client needs attention, or null. The MSA rule wins over the quiet rule. */
export function attention(c: Client, now: Date): string | null {
  if (c.msaEndsAt) {
    const left = Math.ceil((Date.parse(c.msaEndsAt) - now.getTime()) / DAY);
    if (left < 0) return 'MSA has ended';
    if (left <= MSA_WARNING_DAYS) return `MSA ends in ${left} ${left === 1 ? 'day' : 'days'}`;
  }
  if (c.status === 'active') {
    const quiet = daysSince(c.lastContactAt, now);
    if (quiet === null) return 'No contact on record';
    if (quiet >= QUIET_DAYS) return `No contact in ${quiet} days`;
  }
  return null;
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export interface ClientFilter {
  query?: string;
  status?: ClientStatus | 'all';
  /** "me" keeps clients owned by the viewer. */
  owner?: 'all' | 'me';
  channel?: string;
}

export function filterClients(rows: readonly Client[], f: ClientFilter): Client[] {
  const words = fold(f.query ?? '')
    .split(/\s+/)
    .filter(Boolean);
  return rows.filter((c) => {
    if (f.status && f.status !== 'all' && c.status !== f.status) return false;
    if (f.owner === 'me' && c.owner !== 'You') return false;
    if (f.channel && f.channel !== 'all' && c.channel !== f.channel) return false;
    const hay = fold(`${c.name} ${c.owner}`);
    return words.every((w) => hay.includes(w));
  });
}

/** Flagged clients first, then by revenue, then by name. */
export function sortClients(rows: readonly Client[], now: Date): Client[] {
  const flagged = (c: Client) => (attention(c, now) ? 0 : 1);
  return [...rows].sort(
    (a, b) =>
      flagged(a) - flagged(b) || (b.revenue12m ?? 0) - (a.revenue12m ?? 0) || a.name.localeCompare(b.name),
  );
}

export interface ClientTotals {
  clients: number;
  active: number;
  openJobs: number;
  /** Null when no client has a revenue figure yet. */
  revenue12m: number | null;
  needsAttention: number;
}

export function clientTotals(rows: readonly Client[], now: Date): ClientTotals {
  return {
    clients: rows.length,
    active: rows.filter((c) => c.status === 'active').length,
    openJobs: rows.reduce((n, c) => n + c.openJobs, 0),
    revenue12m: rows.some((c) => c.revenue12m !== undefined)
      ? rows.reduce((n, c) => n + (c.revenue12m ?? 0), 0)
      : null,
    needsAttention: rows.filter((c) => attention(c, now)).length,
  };
}

/** Shown where revenue is not tracked yet. */
export const NOT_TRACKED = 'Not tracked';

/** $0, $880K, $1.42M, or "Not tracked" when there is no figure. */
export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return NOT_TRACKED;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

/** Today, Yesterday, or "N days ago". */
export function formatLastContact(iso: string | undefined, now: Date): string {
  const d = daysSince(iso, now);
  if (d === null) return 'Never';
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

/** Channels in first-seen order, for the filter. */
export const channelsOf = (rows: readonly Client[]): string[] => [
  ...new Set(rows.map((c) => c.channel)),
];
