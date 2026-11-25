import type { Attendee, Interview, Scorecard } from './interviews';

/**
 * Representative interviews until the interview API exists. People, clients and figures are
 * fictional. Times are relative to now.
 */

export const FINAL_ROUND = {
  id: 'tom-final',
  title: 'Tom B., final round',
  minutes: 60,
  medium: 'Teams',
  panel: ['Dana W.', 'Ken J.'],
};

/** Busy cells as [dayIndex, timeIndex], keyed like `slotKey` (times match SLOT_TIMES). */
const TIMES = ['10:00', '11:30', '14:00', '15:30'];
const busyAt = (days: readonly string[], cells: [number, number][]) =>
  cells.map(([d, t]) => `${days[d]}T${TIMES[t]}`);

/** Panel and candidate availability over the given business days (5 expected). */
export function representativeAttendees(days: readonly string[]): Attendee[] {
  return [
    {
      name: 'Dana W.',
      source: 'Outlook free/busy',
      busy: busyAt(days, [
        [0, 0],
        [1, 1],
        [2, 0],
        [3, 2],
        [4, 1],
      ]),
    },
    {
      name: 'Ken J.',
      source: 'Outlook free/busy',
      busy: busyAt(days, [
        [0, 2],
        [1, 0],
        [3, 0],
        [4, 3],
        [4, 0],
      ]),
    },
    {
      name: 'Tom B.',
      source: 'his chosen times',
      busy: busyAt(days, [
        [0, 1],
        [1, 3],
        [2, 3],
        [3, 3],
        [4, 2],
      ]),
    },
  ];
}

/**
 * Interviews on the given firm-local business days (5 expected, starting today), plus one in the
 * past. `toIso` converts a firm-local day and time to an instant.
 */
export function representativeInterviews(
  days: readonly string[],
  toIso: (day: string, time: string) => string,
  now: Date,
): Interview[] {
  return [
    {
      id: 'amara-screen',
      title: 'Screening call: Amara K.',
      detail: 'With you',
      startsAt: toIso(days[0]!, '16:30'),
      medium: 'Phone',
      status: 'confirmed',
      note: 'The Screening agent will summarise the call against 5 must-haves for you to check.',
    },
    {
      id: 'hana-fab',
      title: 'Hana S. with Raj P.',
      detail: 'Fabrikam, Cloud Security Analyst',
      startsAt: toIso(days[1]!, '14:00'),
      medium: 'In person',
      status: 'reschedule-requested',
      note: 'Hana asked to move to Friday afternoon.',
    },
    {
      id: 'priya-nw',
      title: 'Priya N. with Dana W.',
      detail: 'Northwind, Senior Java Developer',
      startsAt: toIso(days[2]!, '10:00'),
      medium: 'Teams',
      status: 'confirmed',
    },
    {
      id: 'sofia-contoso',
      title: 'Sofia P. with Lee M.',
      detail: 'Contoso, QA Lead',
      startsAt: toIso(days[3]!, '10:00'),
      medium: 'Teams',
      status: 'awaiting-confirmation',
      note: 'Invite sent; the client has not accepted yet.',
    },
    {
      id: 'old',
      title: 'Jordan E. with Ben C.',
      detail: 'Contoso, Data Engineer',
      startsAt: new Date(now.getTime() - 3 * 86_400_000).toISOString(),
      medium: 'Teams',
      status: 'confirmed',
    },
  ];
}

export function representativeScorecard(now: Date): Scorecard {
  return {
    by: 'Dana W., Northwind',
    at: new Date(now.getTime() - 2 * 86_400_000).toISOString(),
    channel: 'through the client portal',
    overall: 'Yes, move to the final round',
    scores: [
      { area: 'Spring Boot', score: 4, note: 'Clear on transactions and testing' },
      { area: 'Kafka', score: 2, note: 'Light; has used it but not run it' },
      { area: 'Communication', score: 5 },
    ],
    comment: 'Strong on Spring. Light on Kafka; would want a second technical round with Ken.',
  };
}
