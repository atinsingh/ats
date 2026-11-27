/**
 * Sequence logic: follow-ups that stop themselves and obey the firm's sending rules. The first
 * message always needs a person's approval; consent, quiet hours and stop rules apply to every
 * step. Pure and unit-tested (test/sequences.test.ts).
 */

export type Channel = 'email' | 'sms';

export interface Step {
  /** Day 1 is the day the person was added. */
  day: number;
  channel: Channel;
  summary: string;
}

export interface Sequence {
  id: string;
  name: string;
  steps: Step[];
  paused: boolean;
}

export type StopReason = 'replied' | 'opted-out' | 'submitted-elsewhere' | 'job-closed';

export const STOP_LABEL: Record<StopReason, string> = {
  replied: 'Replied',
  'opted-out': 'Opted out',
  'submitted-elsewhere': 'Submitted elsewhere',
  'job-closed': 'Job closed',
};

export interface Enrollee {
  id: string;
  name: string;
  /** YYYY-MM-DD, firm-local. */
  addedOn: string;
  /** Channels the person agreed to be contacted on. */
  consent: Channel[];
  /** How many steps have been handled (sent or skipped). */
  handled: number;
  /** A person approved this enrollee's first message. */
  firstApproved: boolean;
  stop?: StopReason;
}

/** No sends before 8:00 AM or from 8:00 PM, firm-local. */
export const QUIET_END_HOUR = 8;
export const QUIET_START_HOUR = 20;
/** Steps go out at this firm-local time on their day. */
export const SEND_TIME = '09:00';

export type NextStep =
  | { kind: 'stopped'; reason: StopReason }
  | { kind: 'paused' }
  | { kind: 'done' }
  | { kind: 'send'; index: number; step: Step; at: string; needsApproval: boolean };

/** Turns a firm-local day and HH:MM into an ISO instant. */
export type ToIso = (day: string, time: string) => string;

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function localParts(iso: string, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

/** Moves a send out of quiet hours to the next 8:00 AM, firm-local. */
export function outOfQuietHours(iso: string, timeZone: string, toIso: ToIso): string {
  const { day, hour } = localParts(iso, timeZone);
  const at8 = `${String(QUIET_END_HOUR).padStart(2, '0')}:00`;
  if (hour < QUIET_END_HOUR) return toIso(day, at8);
  if (hour >= QUIET_START_HOUR) return toIso(addDays(day, 1), at8);
  return iso;
}

/**
 * The next thing the sequence would do for this person. Stop rules win, then a paused sequence;
 * SMS steps are skipped without SMS consent. Overdue steps go out now, outside quiet hours.
 */
export function nextStep(
  seq: Sequence,
  e: Enrollee,
  now: Date,
  timeZone: string,
  toIso: ToIso,
): NextStep {
  if (e.stop) return { kind: 'stopped', reason: e.stop };
  if (seq.paused) return { kind: 'paused' };
  const index = seq.steps.findIndex((s, i) => i >= e.handled && e.consent.includes(s.channel));
  if (index < 0) return { kind: 'done' };
  const step = seq.steps[index]!;
  const due = toIso(addDays(e.addedOn, step.day - 1), SEND_TIME);
  const at = outOfQuietHours(due > now.toISOString() ? due : now.toISOString(), timeZone, toIso);
  return { kind: 'send', index, step, at, needsApproval: index === 0 || !e.firstApproved };
}

export function sequenceStats(rows: readonly Enrollee[]) {
  return {
    total: rows.length,
    replied: rows.filter((e) => e.stop === 'replied').length,
    optedOut: rows.filter((e) => e.stop === 'opted-out').length,
    active: rows.filter((e) => !e.stop).length,
  };
}

/** Fills {variables}; any missing or blank one blocks sending. */
export function fillTemplate(text: string, vars: Readonly<Record<string, string | undefined>>) {
  const missing = new Set<string>();
  const filled = text.replace(/\{([a-z_]+)\}/g, (whole, name: string) => {
    const v = vars[name]?.trim();
    if (!v) {
      missing.add(name);
      return whole;
    }
    return v;
  });
  return { text: filled, missing: [...missing] };
}

export interface Template {
  id: string;
  name: string;
  usedFor: string;
  body: string;
  sent30d: number;
  /** Replies per send, 0 to 1, or null when replies aren't expected. */
  replyRate: number | null;
}
