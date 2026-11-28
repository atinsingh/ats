'use client';

import { useMemo, useState } from 'react';
import { Button, Icon, cn } from '@jobocate/ui';

import { decide, emptyQueue, isBlocked, undo, type Decision } from '../../lib/review/queue';
import {
  rankTargets,
  toProposal,
  unfilledPlaceholders,
  type SourcingTarget,
} from '../../lib/sourcing/sourcing';
import { CheckRow } from '../review/ReviewQueue';

const OUTCOME: Record<Decision['outcome'], string> = {
  approved: 'Approved',
  edited: 'Edited and approved',
  rejected: 'Skipped',
  overridden: 'Overridden and approved',
};

export function SourcingBoard({
  targets,
  now,
  representative,
}: {
  targets: SourcingTarget[];
  /** ISO time the page was rendered, so server and client agree. */
  now: string;
  representative: boolean;
}) {
  const ranked = useMemo(() => rankTargets(targets), [targets]);
  const proposals = useMemo(() => {
    const at = new Date(now);
    return new Map(ranked.map((t) => [t.id, toProposal(t, at)]));
  }, [ranked, now]);
  const [selectedId, setSelectedId] = useState(ranked[0]?.id ?? null);
  const [queue, setQueue] = useState(emptyQueue);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [announce, setAnnounce] = useState('');

  const target = ranked.find((t) => t.id === selectedId) ?? ranked[0];
  if (!target) {
    return <p className="text-sm text-muted-foreground">No target companies right now.</p>;
  }
  const proposal = proposals.get(target.id)!;
  const decision = queue.decisions[proposal.id];
  const blocked = isBlocked(proposal);
  const text = decision?.draft ?? edits[target.id] ?? target.draft;
  const blanks = unfilledPlaceholders(text);
  const isLast = queue.history[queue.history.length - 1] === proposal.id;
  const pending = ranked.filter((t) => !queue.decisions[proposals.get(t.id)!.id]).length;

  const act = (outcome: 'approve' | 'skip') => {
    try {
      const changed = text.trim() !== target.draft.trim();
      const next = decide(
        queue,
        proposal,
        outcome === 'skip'
          ? { outcome: 'rejected' }
          : changed
            ? { outcome: 'edited', draft: text }
            : { outcome: 'approved' },
      );
      setQueue(next);
      const label = OUTCOME[next.decisions[proposal.id]!.outcome];
      setAnnounce(`${label}: intro to ${target.company}.`);
      const following = ranked.find(
        (t) => t.id !== target.id && !next.decisions[proposals.get(t.id)!.id],
      );
      if (following) setSelectedId(following.id);
    } catch (e) {
      setAnnounce(e instanceof Error ? e.message : 'That decision is not allowed');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {representative ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Representative data. The sourcing agent and job-posting feed are not connected yet, so
          these companies are samples and your decisions stay in this browser tab. Nothing is sent.
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">{pending}</span> of{' '}
        <span className="tabular-nums">{ranked.length}</span> intros waiting for you
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <section
          aria-label="Target companies"
          className="self-start overflow-hidden rounded-xl bg-card shadow-card"
        >
          <ul role="list" className="divide-y divide-border">
            {ranked.map((t) => {
              const p = proposals.get(t.id)!;
              const d = queue.decisions[p.id];
              const sel = t.id === target.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    aria-pressed={sel}
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      'flex min-h-target w-full flex-col gap-1 px-4 py-3 text-left transition-colors duration-fast',
                      sel ? 'bg-accent' : 'hover:bg-muted',
                      d && 'opacity-60',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{t.company}</span>
                      <span
                        className={cn(
                          'text-caption',
                          isBlocked(p) && !d ? 'text-danger' : 'text-muted-foreground',
                        )}
                      >
                        {d
                          ? OUTCOME[d.outcome]
                          : isBlocked(p)
                            ? 'Other desk'
                            : `${t.benchReady} ready`}
                      </span>
                    </span>
                    <span className="text-caption text-muted-foreground">{t.meta}</span>
                    <span className="text-caption">{t.signal}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <article
          aria-labelledby="target-title"
          className="flex min-w-0 flex-col gap-4 rounded-xl bg-card p-5 shadow-card sm:p-6"
        >
          <span className="self-start rounded-sm bg-agent-soft px-2 py-0.5 text-caption font-semibold text-agent-foreground">
            Drafted by the Client sourcing agent
          </span>
          <h2 id="target-title" className="font-display text-[22px] leading-7">
            {proposal.title}
          </h2>
          <p className="text-sm text-muted-foreground">{proposal.summary}</p>
          <p className="text-caption text-muted-foreground">Source: {target.signalSource}.</p>

          <ul role="list" className="flex flex-col gap-2">
            {proposal.checks
              .filter((c) => !c.title.startsWith('Fill in'))
              .map((c) => (
                <CheckRow key={c.title} check={c} />
              ))}
          </ul>

          {target.profiles.length ? (
            <div className="text-sm">
              <p className="text-label">Profiles to offer</p>
              <ul role="list" className="mt-1 flex flex-wrap gap-2">
                {target.profiles.map((p) => (
                  <li key={p} className="rounded-sm bg-muted px-2 py-0.5 text-caption">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {decision || blocked ? (
            <blockquote className="whitespace-pre-wrap border-l-2 border-agent-border pl-4 text-sm">
              {text}
            </blockquote>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="intro-draft" className="text-label">
                Intro email
              </label>
              <textarea
                id="intro-draft"
                rows={6}
                value={text}
                onChange={(e) => setEdits((m) => ({ ...m, [target.id]: e.target.value }))}
                aria-describedby={blanks.length ? 'intro-blanks' : undefined}
                className="w-full rounded-lg border border-input bg-card p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {blanks.length ? (
                <p id="intro-blanks" className="text-caption text-warning">
                  Replace {blanks.join(', ')} before approving.
                </p>
              ) : null}
            </div>
          )}

          <p className="text-sm">
            <span className="text-muted-foreground">If approved, this goes </span>
            {proposal.destination}.
          </p>

          {decision ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
              <Icon name={decision.outcome === 'rejected' ? 'x' : 'check'} />
              <span className="flex-1">{OUTCOME[decision.outcome]}</span>
              {isLast ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-target"
                  onClick={() => {
                    setQueue(undo(queue));
                    setAnnounce(`Undone. The intro to ${target.company} is waiting again.`);
                  }}
                >
                  Undo
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {blocked ? (
                <p className="w-full text-sm text-danger">
                  {target.company} belongs to {target.owner}&apos;s desk, so you can&apos;t pitch it
                  from here.
                </p>
              ) : (
                <Button
                  className="min-h-target"
                  disabled={blanks.length > 0}
                  onClick={() => act('approve')}
                >
                  {proposal.approveLabel}
                </Button>
              )}
              <Button variant="outline" className="min-h-target" onClick={() => act('skip')}>
                Skip
              </Button>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
