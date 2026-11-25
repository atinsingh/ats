/** Instant candidate search for the recruiter list. Pure, so it is unit-tested. */

export interface CandidateRow {
  id: string;
  fullName: string;
  email: string;
  headline?: string | null;
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const byName = (a: CandidateRow, b: CandidateRow) =>
  fold(a.fullName).localeCompare(fold(b.fullName));

/**
 * Every word of the query must appear in the name, headline or email (case- and
 * accent-insensitive). Candidates whose name matches every word come first, then by name.
 */
export function searchCandidates<C extends CandidateRow>(rows: readonly C[], query: string): C[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...rows].sort(byName);
  return rows
    .map((row) => {
      const name = fold(row.fullName);
      const all = `${name} ${fold(row.headline ?? '')} ${fold(row.email)}`;
      if (!words.every((w) => all.includes(w))) return null;
      return { row, rank: words.every((w) => name.includes(w)) ? 0 : 1 };
    })
    .filter((x): x is { row: C; rank: number } => x !== null)
    .sort((a, b) => a.rank - b.rank || byName(a.row, b.row))
    .map((x) => x.row);
}
