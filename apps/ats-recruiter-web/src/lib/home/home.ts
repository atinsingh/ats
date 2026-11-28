/**
 * Command center logic: what needs the recruiter today, gathered from the other modules. It only
 * summarises and links; nothing here acts on a candidate. Pure and unit-tested (test/home.test.ts).
 */
import type { Interview } from '../interviews/interviews';
import type { Proposal } from '../review/queue';

/** A decision due within this many hours, or overdue, counts as urgent. */
export const URGENT_HOURS = 3;

const dayIn = (d: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(d)
    .slice(0, 10);

export function greeting(now: Date, timeZone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(now),
  );
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

/** "Wednesday, November 26" in the firm's time zone. */
export const longDate = (now: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);

const WORDS = [
  'No',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
];

/** "Twelve decisions wait.", "One decision waits." or "Nothing waits for you." */
export function decisionsHeadline(count: number): string {
  if (count <= 0) return 'Nothing waits for you.';
  const n = count < WORDS.length ? WORDS[count]! : String(count);
  return count === 1 ? `${n} decision waits.` : `${n} decisions wait.`;
}

export interface DecisionSummary {
  total: number;
  /** Due within URGENT_HOURS, or overdue. */
  urgent: number;
  /** A failed check means it can only go out through a written override. */
  blocked: number;
  /** The one due soonest, or null with none. */
  next: Proposal | null;
}

export function decisionSummary(pending: readonly Proposal[], now: Date): DecisionSummary {
  const limit = now.getTime() + URGENT_HOURS * 3_600_000;
  const sorted = [...pending].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  return {
    total: pending.length,
    urgent: pending.filter((p) => Date.parse(p.dueAt) <= limit).length,
    blocked: pending.filter((p) => p.checks.some((c) => c.status === 'fail')).length,
    next: sorted[0] ?? null,
  };
}

/** Interviews on today's firm-local date, earliest first, and the next one still to start. */
export function interviewsToday(rows: readonly Interview[], now: Date, timeZone: string) {
  const today = dayIn(now, timeZone);
  const list = rows
    .filter((i) => dayIn(new Date(i.startsAt), timeZone) === today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return { list, next: list.find((i) => Date.parse(i.startsAt) >= now.getTime()) ?? null };
}

export type Tone = 'danger' | 'warning' | 'info';

export interface Attention {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
  href: string;
  /** ISO time it is due or happened, when there is one. */
  at?: string;
}

const TONE_RANK: Record<Tone, number> = { danger: 0, warning: 1, info: 2 };

/** Most severe first, then by time (timeless last), then by title; ids kept unique. */
export function attentionList(...groups: readonly (readonly Attention[])[]): Attention[] {
  const seen = new Set<string>();
  return groups
    .flat()
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort(
      (a, b) =>
        TONE_RANK[a.tone] - TONE_RANK[b.tone] ||
        (a.at ?? '￿').localeCompare(b.at ?? '￿') ||
        a.title.localeCompare(b.title),
    );
}

/** "1:30 PM" in the firm's time zone. */
export const clock = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  );

/** One Command center source and whether it came from its live service. */
export interface Source {
  label: string;
  live: boolean;
}

/** "a", "a and b", "a, b and c". */
function listWords(words: readonly string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/**
 * The note above the Command center saying which figures are samples. Null when every source is
 * live, so nothing real is labelled as a sample and no sample passes as real.
 */
export function sampleNote(sources: readonly Source[]): string | null {
  const samples = sources.filter((s) => !s.live).map((s) => s.label);
  if (!samples.length) return null;
  if (samples.length === sources.length) {
    return 'Representative data. These figures come from the same samples as each module until their services are connected.';
  }
  const live = sources.filter((s) => s.live).map((s) => s.label);
  return `Live: ${listWords(live)}. Representative samples until their services are connected: ${listWords(samples)}.`;
}

