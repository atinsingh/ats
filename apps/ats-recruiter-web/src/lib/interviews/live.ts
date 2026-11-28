import type { InterviewRecord, InterviewType } from '@jobocate/api-sdk';

import type { Interview } from './interviews';

/** Real interviews from application-service, shaped for the week agenda. */

const TYPE_LABEL: Record<InterviewType, string> = {
  PHONE: 'Phone screen',
  VIDEO: 'Video interview',
  ONSITE: 'On-site interview',
  TECHNICAL: 'Technical interview',
  PANEL: 'Panel interview',
};

/** "Video call", "Phone", or the place for an on-site interview. */
export function mediumOf(i: Pick<InterviewRecord, 'type' | 'location' | 'meetingUrl'>): string {
  if (i.type === 'PHONE') return 'phone';
  if (i.meetingUrl) return 'video call';
  if (i.location) return i.location;
  return i.type === 'ONSITE' ? 'on site' : 'place not set';
}

/** Only scheduled and rescheduled interviews belong on the agenda. */
export function toAgendaRows(
  rows: readonly InterviewRecord[],
  jobTitles: ReadonlyMap<string, string>,
): Interview[] {
  return rows
    .filter((i) => i.status === 'SCHEDULED' || i.status === 'RESCHEDULED')
    .map((i) => ({
      id: i.id,
      title: TYPE_LABEL[i.type] ?? 'Interview',
      detail: jobTitles.get(i.jobId) ?? 'Job not found',
      startsAt: i.scheduledStart,
      medium: mediumOf(i),
      status: i.status === 'RESCHEDULED' ? 'rescheduled' : 'scheduled',
    }));
}

/** Unique job ids in first-seen order, capped so the page makes a bounded number of lookups. */
export function jobIdsToLookUp(rows: readonly InterviewRecord[], cap = 25): string[] {
  return [...new Set(rows.map((r) => r.jobId))].slice(0, cap);
}
