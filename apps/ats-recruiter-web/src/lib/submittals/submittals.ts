/**
 * Submittals list logic. Pure, so the rules are unit-tested (test/submittals.test.ts) and the page
 * stays thin. A flag here only suggests a follow-up; nothing is sent from this screen.
 */

export type SubmittalStatus =
  | 'awaiting-approval'
  | 'blocked'
  | 'client-reviewing'
  | 'interview'
  | 'offer'
  | 'client-passed'
  | 'withdrawn';

export const STATUS_LABEL: Record<SubmittalStatus, string> = {
  'awaiting-approval': 'Waiting for you',
  blocked: 'Blocked',
  'client-reviewing': 'Client reviewing',
  interview: 'Interview',
  offer: 'Offer',
  'client-passed': 'Client passed',
  withdrawn: 'Withdrawn',
};

export interface Submittal {
  id: string;
  candidate: string;
  job: string;
  client: string;
  /** How it reaches the client, e.g. "Beeline", "Fieldglass" or "direct". */
  channel: string;
  status: SubmittalStatus;
  /** Bill rate in dollars per hour. */
  billRate: number;
  /** When the candidate was shortlisted for this job. */
  shortlistedAt?: string;
  /** When it went to the client. Missing while it waits for approval or is blocked. */
  submittedAt?: string;
  /** The client's latest reply or portal update, if any. */
  lastClientActivityAt?: string;
  /** Short note on the latest event, e.g. "Interview Nov 27" or "Wants retail domain". */
  latest: string;
  owner: string;
  /** Why it cannot go out. Set when status is "blocked". */
  block?: { kind: 'duplicate' | 'margin'; detail: string };
}

/** A client silent for more than this many business days gets a follow-up flag. */
export const FOLLOW_UP_BUSINESS_DAYS = 3;

/** Statuses a person still has to act on before anything goes to the client. */
export const NEEDS_YOU: readonly SubmittalStatus[] = ['awaiting-approval', 'blocked'];

/**
 * Weekdays after `from`, up to and including `to`, counted on UTC calendar days. Public holidays
 * are not known here yet, so they count as business days.
 */
export function businessDaysBetween(from: Date, to: Date): number {
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const end = day(to);
  let n = 0;
  for (let t = day(from) + 86_400_000; t <= end; t += 86_400_000) {
    const wd = new Date(t).getUTCDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}

/** Business days since the client last did anything, or null when it is not with the client. */
export function clientSilence(s: Submittal, now: Date): number | null {
  if (s.status !== 'client-reviewing') return null;
  const since = s.lastClientActivityAt ?? s.submittedAt;
  if (!since) return null;
  return businessDaysBetween(new Date(since), now);
}

export function followUpDue(s: Submittal, now: Date): boolean {
  const days = clientSilence(s, now);
  return days !== null && days > FOLLOW_UP_BUSINESS_DAYS;
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export interface SubmittalFilter {
  query?: string;
  status?: SubmittalStatus | 'all';
  client?: string;
}

/** Every word of the query must match the candidate, job or client. */
export function filterSubmittals(rows: readonly Submittal[], f: SubmittalFilter): Submittal[] {
  const words = fold(f.query ?? '')
    .split(/\s+/)
    .filter(Boolean);
  return rows.filter((s) => {
    if (f.status && f.status !== 'all' && s.status !== f.status) return false;
    if (f.client && f.client !== 'all' && s.client !== f.client) return false;
    if (!words.length) return true;
    const hay = fold(`${s.candidate} ${s.job} ${s.client}`);
    return words.every((w) => hay.includes(w));
  });
}

/** People first who need you, then follow-ups due, then the most recently submitted. */
export function sortSubmittals(rows: readonly Submittal[], now: Date): Submittal[] {
  const rank = (s: Submittal) => (NEEDS_YOU.includes(s.status) ? 0 : followUpDue(s, now) ? 1 : 2);
  const t = (s: Submittal) => (s.submittedAt ? Date.parse(s.submittedAt) : Infinity);
  return [...rows].sort((a, b) => rank(a) - rank(b) || t(b) - t(a));
}

export interface SubmittalStats {
  submittedThisWeek: number;
  /** Share of submitted people who reached interview or offer, 0 to 1, or null with none. */
  submitToInterview: number | null;
  waitingOnClients: number;
  followUpsDue: number;
  /** Median hours from shortlist to submit, or null with no pairs. */
  medianHoursToSubmit: number | null;
}

export function submittalStats(rows: readonly Submittal[], now: Date): SubmittalStats {
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const submitted = rows.filter((s) => s.submittedAt && s.status !== 'withdrawn');
  const reached = submitted.filter((s) => s.status === 'interview' || s.status === 'offer');
  const hours = rows
    .filter((s) => s.shortlistedAt && s.submittedAt)
    .map((s) => (Date.parse(s.submittedAt!) - Date.parse(s.shortlistedAt!)) / 3_600_000)
    .sort((a, b) => a - b);
  const mid = hours.length >> 1;
  return {
    submittedThisWeek: rows.filter((s) => s.submittedAt && Date.parse(s.submittedAt) >= weekAgo)
      .length,
    submitToInterview: submitted.length ? reached.length / submitted.length : null,
    waitingOnClients: rows.filter((s) => s.status === 'client-reviewing').length,
    followUpsDue: rows.filter((s) => followUpDue(s, now)).length,
    medianHoursToSubmit: hours.length
      ? hours.length % 2
        ? hours[mid]!
        : (hours[mid - 1]! + hours[mid]!) / 2
      : null,
  };
}

/** Clients in first-seen order, for the client filter. */
export const clientsOf = (rows: readonly Submittal[]): string[] => [
  ...new Set(rows.map((s) => s.client)),
];
