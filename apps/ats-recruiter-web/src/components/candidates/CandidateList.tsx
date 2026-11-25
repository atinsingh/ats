'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CandidateSummary } from '@jobocate/api-sdk';
import { Icon } from '@jobocate/ui';

import { searchCandidates } from '../../lib/candidates/search';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

export function CandidateList({ candidates }: { candidates: CandidateSummary[] }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCandidates(candidates, query), [candidates, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex h-control w-full max-w-md items-center gap-2 rounded-lg bg-card px-3 shadow-card focus-within:ring-2 focus-within:ring-ring">
          <Icon name="search" className="text-muted-foreground" />
          <span className="sr-only">Search candidates</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, headline or email"
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          <span className="font-semibold tabular-nums text-foreground">{results.length}</span> of{' '}
          <span className="tabular-nums">{candidates.length}</span>
        </p>
      </div>

      <section aria-label="Candidates" className="overflow-hidden rounded-xl bg-card shadow-card">
        {results.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No one matches “{query.trim()}”.{' '}
            <button
              type="button"
              className="font-semibold text-foreground underline"
              onClick={() => setQuery('')}
            >
              Clear search
            </button>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-border">
            {results.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/recruiter/candidates/${encodeURIComponent(c.id)}`}
                  className="flex min-h-target items-center gap-3 px-4 py-3 transition-colors duration-fast hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-caption font-semibold text-muted-foreground"
                  >
                    {initials(c.fullName)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{c.fullName}</span>
                    <span className="truncate text-caption text-muted-foreground">
                      {c.headline || 'No headline yet'}
                    </span>
                  </span>
                  <span className="hidden truncate text-caption text-muted-foreground sm:block">
                    {c.email}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
