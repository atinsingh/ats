/**
 * Talent search logic: one search string per source, written from a job's parts, and the firm's
 * own database matches. External sources are copy-out only; Insyght never runs searches there.
 * Pure and unit-tested (test/talent.test.ts).
 */

export type Source = 'db' | 'linkedin' | 'xray' | 'indeed' | 'dice';

export const SOURCES: readonly { id: Source; label: string; note: string }[] = [
  {
    id: 'db',
    label: 'Your database',
    note: 'Runs here, on people your firm already has. People placed now and anyone marked do not contact are always left out.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn Recruiter',
    note: 'Copy into LinkedIn Recruiter. Insyght never automates LinkedIn; you run the search there.',
  },
  {
    id: 'xray',
    label: 'Google X-ray',
    note: 'Copy into Google. Public profiles only; open them yourself.',
  },
  {
    id: 'indeed',
    label: 'Indeed',
    note: 'Copy into your Indeed Smart Sourcing seat. Contacts use your Indeed credits.',
  },
  { id: 'dice', label: 'Dice', note: 'Copy into Dice IntelliSearch with your Dice seat.' },
];

export interface SearchParts {
  titles: string[];
  /** Every group must match; any term inside a group may. */
  skills: string[][];
  exclude: string[];
  locations: string[];
  /** Radius around the first location, for the database. */
  radiusKm: number;
  /** YYYY-MM-DD: available on or before, for the database. */
  availableBy?: string;
}

/** Trims, drops stray quotes and blanks, and removes duplicates ignoring case. */
export function cleanTerms(terms: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of terms) {
    const t = raw.replace(/["“”]/g, '').replace(/\s+/g, ' ').trim();
    const key = t.toLowerCase();
    if (t && !seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

/** "a, b , c" into terms. */
export const splitTerms = (text: string) => cleanTerms(text.split(','));

const quote = (t: string) => (/\s/.test(t) ? `"${t}"` : t);

/** One term bare, several in brackets joined by OR. Empty for none. */
export function orGroup(terms: readonly string[]): string {
  const q = cleanTerms(terms).map(quote);
  if (!q.length) return '';
  return q.length === 1 ? q[0]! : `(${q.join(' OR ')})`;
}

const and = (parts: readonly string[]) => parts.filter(Boolean).join(' AND ');

/** Always excluded from the database, whatever the parts say. */
export const DB_ALWAYS_EXCLUDED = ['placed_active', 'do_not_contact'] as const;

export function buildString(parts: SearchParts, source: Source): string {
  const titles = orGroup(parts.titles);
  const skills = parts.skills.map(orGroup).filter(Boolean);
  const exclude = orGroup(parts.exclude);
  const locations = cleanTerms(parts.locations);

  switch (source) {
    case 'db': {
      const core = and([
        titles && `title:${titles.startsWith('(') ? titles : `(${titles})`}`,
        ...skills.map((s) => `skill:${s}`),
      ]);
      const where = and([
        locations[0] ? `location:within(${parts.radiusKm}km, "${locations[0]}")` : '',
        parts.availableBy ? `available:<=${parts.availableBy}` : '',
        exclude ? `NOT keyword:${exclude}` : '',
      ]);
      return [
        core && `(${core})`,
        where && `AND ${where}`,
        `NOT status:(${DB_ALWAYS_EXCLUDED.join(' OR ')})`,
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'linkedin':
      return [and([titles, ...skills]), exclude && `NOT ${exclude}`].filter(Boolean).join(' ');
    case 'xray':
      return [
        'site:linkedin.com/in',
        titles,
        ...skills,
        orGroup(locations),
        ...cleanTerms(parts.exclude).map((t) => `-${quote(t)}`),
        '-intitle:jobs -recruiter',
      ]
        .filter(Boolean)
        .join(' ');
    case 'indeed':
      return [and([titles && `title:${titles}`, ...skills]), exclude && `NOT ${exclude}`]
        .filter(Boolean)
        .join(' ');
    case 'dice':
      return and([titles, ...skills, orGroup(locations)]);
  }
}

/** Why the parts can't make a useful string, or null. */
export function partsProblem(parts: SearchParts): string | null {
  if (!cleanTerms(parts.titles).length && !parts.skills.some((g) => cleanTerms(g).length))
    return 'Add at least one title or skill.';
  return null;
}

export interface Match {
  id: string;
  name: string;
  /** Must-haves found in the profile, out of the job's total. */
  found: number;
  of: number;
  title: string;
  /** YYYY-MM-DD, or empty when available now. */
  available: string;
  /** Shown instead of the date when set, e.g. "Not looking" or "Not stated". */
  availableLabel?: string;
  /** YYYY-MM-DD of the last contact, empty for never, or null when contact is not tracked. */
  lastContact: string | null;
  /** Channels the person agreed to be contacted on. Empty means none recorded. */
  consent: string[];
  shortlisted?: boolean;
}

/** Most must-haves first, then soonest available, then by name. */
export function sortMatches(rows: readonly Match[]): Match[] {
  return [...rows].sort(
    (a, b) =>
      b.found / b.of - a.found / a.of ||
      (a.available || '0000').localeCompare(b.available || '0000') ||
      a.name.localeCompare(b.name),
  );
}

/** Adds ids to a shortlist without duplicates; shortlisting contacts nobody. */
export function addToShortlist(current: readonly string[], ids: readonly string[]): string[] {
  return [...new Set([...current, ...ids])];
}
