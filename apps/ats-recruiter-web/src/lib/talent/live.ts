import type { Job, TalentMatch } from '@jobocate/api-sdk';

import type { TalentJob } from './representative';
import type { Match, SearchParts } from './talent';

/** Real open jobs and own-database matches, shaped for Talent search. */

/** At most this many of a job's skills become must-haves. */
export const MAX_SKILL_GROUPS = 6;

/** A job's default must-haves: its title, each listed skill, and its location. */
export function jobToParts(
  job: Pick<Job, 'title' | 'skills' | 'locationCity' | 'locationRegion' | 'location'>,
): SearchParts {
  const place =
    [job.locationCity, job.locationRegion].filter(Boolean).join(', ') || job.location || '';
  return {
    titles: [job.title.trim().toLowerCase()],
    skills: (job.skills ?? [])
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, MAX_SKILL_GROUPS)
      .map((s) => [s]),
    exclude: [],
    locations: place ? [place] : [],
    radiusKm: 50,
  };
}

export function jobLabel(job: Pick<Job, 'title' | 'locationCity' | 'location'>): string {
  const where = job.locationCity || job.location;
  return where ? `${job.title}, ${where}` : job.title;
}

const DAY = 86_400_000;
const AHEAD: Record<string, number> = { TWO_WEEKS: 14, ONE_MONTH: 30, THREE_MONTHS: 90 };

/** today is YYYY-MM-DD in the firm's zone. */
export function toMatch(m: TalentMatch, today: string): Match {
  const base = {
    id: m.id,
    name: m.fullName,
    found: m.found,
    of: m.of,
    title: m.headline || 'No headline',
    // Contact history and contact channels are not tracked yet.
    lastContact: null,
    consent: [],
  };
  if (m.availability === 'IMMEDIATE') return { ...base, available: '' };
  const days = m.availability ? AHEAD[m.availability] : undefined;
  if (days !== undefined) {
    const d = new Date(Date.parse(`${today}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
    return { ...base, available: d };
  }
  return {
    ...base,
    available: '',
    availableLabel: m.availability === 'PASSIVE' ? 'Not looking' : 'Not stated',
  };
}

export function toTalentJob(job: Job, matches: readonly TalentMatch[], today: string): TalentJob {
  return {
    id: job.id,
    label: jobLabel(job),
    parts: jobToParts(job),
    matches: matches.map((m) => toMatch(m, today)),
  };
}
