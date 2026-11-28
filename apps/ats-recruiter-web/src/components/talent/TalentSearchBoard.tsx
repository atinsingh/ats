'use client';

import { useMemo, useState } from 'react';
import { Button, cn } from '@jobocate/ui';

import {
  SOURCES,
  addToShortlist,
  buildString,
  partsProblem,
  sortMatches,
  splitTerms,
  type SearchParts,
  type Source,
} from '../../lib/talent/talent';
import type { TalentJob } from '../../lib/talent/representative';

const control =
  'h-control w-full rounded-lg bg-card px-3 text-sm shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring';

const formatDay = (d: string) =>
  d
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: d.slice(0, 4) === new Date().toISOString().slice(0, 4) ? undefined : 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${d}T00:00:00Z`))
    : '';

type Field = 'titles' | 'skills' | 'exclude' | 'locations';

const FIELDS: { key: Field; label: string; hint: string }[] = [
  { key: 'titles', label: 'Titles', hint: 'Any of these, separated by commas' },
  {
    key: 'skills',
    label: 'Must-have skills',
    hint: 'Commas within a line mean any of; each line must match',
  },
  { key: 'exclude', label: 'Exclude', hint: 'Separated by commas' },
  { key: 'locations', label: 'Locations', hint: 'First one sets the database radius' },
];

const toText = (parts: SearchParts, key: Field) =>
  key === 'skills' ? parts.skills.map((g) => g.join(', ')).join('\n') : parts[key].join(', ');

export function TalentSearchBoard({
  jobs,
  saved,
  representative,
}: {
  jobs: TalentJob[];
  saved: { id: string; name: string; schedule: string; latest: string; on: boolean }[];
  representative: boolean;
}) {
  const [jobId, setJobId] = useState(jobs[0]?.id ?? '');
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];
  const [edits, setEdits] = useState<Record<string, SearchParts>>({});
  const [source, setSource] = useState<Source>('db');
  const [selected, setSelected] = useState<string[]>([]);
  const [shortlist, setShortlist] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState('');

  const parts = job ? (edits[job.id] ?? job.parts) : null;
  const matches = useMemo(() => (job ? sortMatches(job.matches) : []), [job]);
  if (!job || !parts) return <p className="text-sm text-muted-foreground">No open jobs.</p>;

  const str = buildString(parts, source);
  const problem = partsProblem(parts);
  const meta = SOURCES.find((s) => s.id === source)!;
  const listed = shortlist[job.id] ?? [];

  const setField = (key: Field, text: string) => {
    const next: SearchParts =
      key === 'skills'
        ? {
            ...parts,
            skills: text
              .split('\n')
              .map(splitTerms)
              .filter((g) => g.length),
          }
        : { ...parts, [key]: splitTerms(text) };
    setEdits((e) => ({ ...e, [job.id]: next }));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(str);
      setStatus(`${meta.label} string copied.`);
    } catch {
      setStatus('Could not copy. Select the string and copy it yourself.');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {representative ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Representative data. Candidate search is not connected to this page yet, so these jobs and
          matches are samples and nothing here is saved.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Your open jobs and your own database. Matches only include people who agreed to be
          searchable. Last contact and contact channels are not tracked yet.
        </p>
      )}

      <label className="flex max-w-md flex-col gap-1 text-sm">
        <span className="font-semibold">For job</span>
        <select
          value={job.id}
          onChange={(e) => {
            setJobId(e.target.value);
            setSelected([]);
            setStatus('');
          }}
          className={control}
        >
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section
          aria-labelledby="string-title"
          className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
        >
          <h2 id="string-title" className="font-display text-[22px] leading-7">
            Search string
          </h2>
          <div role="tablist" aria-label="Source" className="flex flex-wrap gap-1">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === source}
                onClick={() => {
                  setSource(s.id);
                  setStatus('');
                }}
                className={cn(
                  'min-h-target rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  s.id === source ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" aria-label={meta.label} className="flex flex-col gap-3">
            {problem ? (
              <p className="text-sm text-danger">{problem}</p>
            ) : (
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 font-mono text-[13px] leading-5">
                {str}
              </pre>
            )}
            <p className="text-caption text-muted-foreground">{meta.note}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-target"
                disabled={!!problem}
                onClick={copy}
              >
                Copy string
              </Button>
              <p role="status" className="text-caption text-muted-foreground">
                {status}
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="parts-title"
          className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
        >
          <div>
            <h2 id="parts-title" className="font-display text-[22px] leading-7">
              What the string is built from
            </h2>
            <p className="text-caption text-muted-foreground">
              Written by the Sourcing agent from the job&apos;s must-haves. Change a part and every
              source&apos;s string updates.
            </p>
          </div>
          {FIELDS.map((f) => (
            <label key={`${job.id}-${f.key}`} className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">{f.label}</span>
              <textarea
                rows={f.key === 'skills' ? 2 : 1}
                defaultValue={toText(parts, f.key)}
                onChange={(e) => setField(f.key, e.target.value)}
                className="min-h-control w-full resize-y rounded-lg bg-card px-3 py-2 text-sm shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-caption text-muted-foreground">{f.hint}</span>
            </label>
          ))}
        </section>
      </div>

      <section
        aria-labelledby="matches-title"
        className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="matches-title" className="font-display text-[22px] leading-7">
              Matches in your database
            </h2>
            <p className="text-caption text-muted-foreground">
              Must-haves found in each profile. Adding to the shortlist contacts nobody; outreach
              still goes through your Review queue.
            </p>
          </div>
          <Button
            className="min-h-target"
            disabled={!selected.length}
            onClick={() => {
              setShortlist((s) => ({ ...s, [job.id]: addToShortlist(listed, selected) }));
              setStatus(
                `${selected.length} added to the ${job.label.split(',')[0]} shortlist. Nobody was contacted.`,
              );
              setSelected([]);
            }}
          >
            {selected.length ? `Add ${selected.length} to shortlist` : 'Add to shortlist'}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">
              Matches for {job.label} in your database, most must-haves first.
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-caption text-muted-foreground">
                <th scope="col" className="w-10 px-3 py-2">
                  <span className="sr-only">Select</span>
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Candidate
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Must-haves
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Current title
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Available
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Last contact
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Can contact
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {matches.map((m) => {
                const on = listed.includes(m.id);
                return (
                  <tr key={m.id}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="size-4"
                        aria-label={`Select ${m.name}`}
                        disabled={on}
                        checked={on || selected.includes(m.id)}
                        onChange={(e) =>
                          setSelected((s) =>
                            e.target.checked ? [...s, m.id] : s.filter((x) => x !== m.id),
                          )
                        }
                      />
                    </td>
                    <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium">
                      {m.name}
                      {on ? (
                        <span className="ml-2 rounded-sm bg-success-soft px-1.5 py-0.5 text-caption font-semibold text-success">
                          Shortlisted
                        </span>
                      ) : null}
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {m.found}/{m.of}
                    </td>
                    <td className="px-3 py-2">{m.title}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {m.availableLabel ?? (m.available ? formatDay(m.available) : 'Now')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {m.lastContact === null ? '–' : m.lastContact ? formatDay(m.lastContact) : 'Never'}
                    </td>
                    <td className={cn('px-3 py-2', !m.consent.length && 'text-muted-foreground')}>
                      {m.consent.length
                        ? `Yes, ${m.consent.map((c) => (c === 'sms' ? 'SMS' : c)).join(' or ')}`
                        : 'Ask first'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section
        aria-labelledby="saved-title"
        className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
      >
        <h2 id="saved-title" className="font-display text-[22px] leading-7">
          Saved searches
        </h2>
        {saved.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved searches yet.</p>
        ) : null}
        <ul className="divide-y divide-border">
          {saved.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="min-w-0">
                <span className="block font-medium">{s.name}</span>
                <span className="block text-caption text-muted-foreground">
                  {s.schedule} · {s.latest}
                </span>
              </span>
              <span
                className={cn(
                  'rounded-sm px-2 py-0.5 text-caption font-semibold',
                  s.on ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground',
                )}
              >
                {s.on ? 'On' : 'Paused'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
