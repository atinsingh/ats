import type { Proposal } from '../review/queue';

/**
 * Interviews logic: finding a time every panelist and the candidate can make, this week's agenda,
 * and the client's scorecard summary. Times are firm-local ("YYYY-MM-DD" and "HH:MM") so the grid
 * reads the same for everyone. Pure and unit-tested (test/interviews.test.ts).
 */

/** Start times offered each business day, firm-local. */
export const SLOT_TIMES = ['10:00', '11:30', '14:00', '15:30'] as const;

export interface Slot {
  /** Firm-local date, YYYY-MM-DD. */
  day: string;
  /** Firm-local start, HH:MM (24h). */
  time: string;
}

export const slotKey = (s: Slot) => `${s.day}T${s.time}`;

/** The firm-local calendar date of an instant. */
export const localDay = (at: Date, timeZone: string) =>
  at.toLocaleDateString('en-CA', { timeZone });

const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
};
const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

/** The next `count` business days, starting today when today is one. */
export function businessDays(now: Date, timeZone: string, count: number): string[] {
  const out: string[] = [];
  for (let day = localDay(now, timeZone); out.length < count; day = addDays(day, 1)) {
    const wd = weekday(day);
    if (wd !== 0 && wd !== 6) out.push(day);
  }
  return out;
}

export interface Attendee {
  name: string;
  /** Where availability came from, e.g. "Outlook free/busy" or "his chosen times". */
  source: string;
  /** Slot keys when this person is busy. */
  busy: readonly string[];
}

export interface SlotCell extends Slot {
  /** Names of attendees who are busy then; empty when everyone is free. */
  busy: string[];
  /** Before `now` on today, so not offerable. */
  past: boolean;
}

/** A grid of days × times with who is busy in each cell. */
export function slotGrid(
  days: readonly string[],
  attendees: readonly Attendee[],
  now: Date,
  timeZone: string,
): SlotCell[][] {
  const today = localDay(now, timeZone);
  const nowTime = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  });
  return SLOT_TIMES.map((time) =>
    days.map((day) => {
      const key = slotKey({ day, time });
      return {
        day,
        time,
        busy: attendees.filter((a) => a.busy.includes(key)).map((a) => a.name),
        past: day < today || (day === today && time <= nowTime),
      };
    }),
  );
}

/** Slots everyone can make, earliest first. */
export const commonFree = (grid: SlotCell[][]): Slot[] =>
  grid
    .flat()
    .filter((c) => !c.past && c.busy.length === 0)
    .map(({ day, time }) => ({ day, time }))
    .sort((a, b) => slotKey(a).localeCompare(slotKey(b)));

/** The instant (ISO) of a firm-local date and HH:MM time. */
export function zonedToIso(day: string, time: string, timeZone: string): string {
  const [y, mo, d] = day.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, Number(p.value)]),
  );
  const shown = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return new Date(guess - (shown - guess)).toISOString();
}

/** "Thu Nov 27" from a firm-local date. */
export const formatDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

/** "11:30 AM" from HH:MM. */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${((h! + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h! < 12 ? 'AM' : 'PM'}`;
}

export const formatSlot = (s: Slot) => `${formatDay(s.day)}, ${formatTime(s.time)}`;

export type InterviewStatus =
  | 'confirmed'
  | 'reschedule-requested'
  | 'awaiting-confirmation'
  | 'scheduled'
  | 'rescheduled';

export interface Interview {
  id: string;
  title: string;
  /** Client and job, e.g. "Northwind, Senior Java Developer". */
  detail: string;
  startsAt: string;
  medium: string;
  status: InterviewStatus;
  note?: string;
}

export interface AgendaItem extends Interview {
  /** "Today", "Tomorrow" or "Thu Nov 27". */
  dayLabel: string;
  timeLabel: string;
}

/** Interviews from now through the next 7 days, soonest first, with firm-local labels. */
export function weekAgenda(rows: readonly Interview[], now: Date, timeZone: string): AgendaItem[] {
  const today = localDay(now, timeZone);
  const end = now.getTime() + 7 * 86_400_000;
  return rows
    .filter((i) => {
      const t = Date.parse(i.startsAt);
      return t >= now.getTime() - 3_600_000 && t <= end;
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map((i) => {
      const at = new Date(i.startsAt);
      const day = localDay(at, timeZone);
      return {
        ...i,
        dayLabel: day === today ? 'Today' : day === addDays(today, 1) ? 'Tomorrow' : formatDay(day),
        timeLabel: at.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone,
        }),
      };
    });
}

export interface Scorecard {
  by: string;
  at: string;
  channel: string;
  overall: string;
  scores: { area: string; score: number; note?: string }[];
  comment: string;
}

/** Scores at or below this out of 5 are listed as gaps. */
export const SCORE_BAR = 2;

export function summarizeScorecard(card: Scorecard): { average: number; gaps: string[] } {
  const total = card.scores.reduce((n, s) => n + s.score, 0);
  return {
    average: card.scores.length ? Math.round((total / card.scores.length) * 10) / 10 : 0,
    gaps: card.scores.filter((s) => s.score <= SCORE_BAR).map((s) => s.area),
  };
}

/** Proposing a time is a person's decision; the invite goes only after approval. */
export function inviteProposal(
  slot: Slot,
  meeting: { id: string; title: string; minutes: number; medium: string; panel: string[] },
): Proposal {
  return {
    id: `invite-${meeting.id}-${slotKey(slot)}`,
    kind: 'message',
    agent: 'Scheduling',
    title: `Invite for ${meeting.title}, ${formatSlot(slot)}`,
    summary: `${meeting.minutes} minutes on ${meeting.medium} with ${meeting.panel.join(' and ')}`,
    destination: 'as a calendar invite from your calendar',
    dueAt: `${slot.day}T00:00:00Z`,
    dueLabel: formatSlot(slot),
    approveLabel: `Propose ${formatSlot(slot)}`,
    checks: [{ status: 'pass', title: 'Everyone is free', detail: formatSlot(slot) }],
    evidence: [],
  };
}
