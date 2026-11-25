'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Icon, cn } from '@jobocate/ui';

import {
  OVERRIDE_MIN_CHARS,
  decide,
  emptyQueue,
  filterByKind,
  isBlocked,
  moveSelection,
  pendingCount,
  sortByDeadline,
  undo,
  type Check,
  type Decision,
  type DecisionInput,
  type Proposal,
  type ProposalKind,
} from '../../lib/review/queue';

const FILTERS: { value: ProposalKind | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'submittal', label: 'Submittals' },
  { value: 'message', label: 'Messages' },
  { value: 'job-post', label: 'Job posts' },
  { value: 'timesheet', label: 'Timesheets' },
];

const OUTCOME_LABEL: Record<Decision['outcome'], string> = {
  approved: 'Approved',
  edited: 'Edited and approved',
  rejected: 'Rejected',
  overridden: 'Overridden and approved',
};

export function ReviewQueue({
  proposals,
  representative,
}: {
  proposals: Proposal[];
  representative: boolean;
}) {
  const sorted = useMemo(() => sortByDeadline(proposals), [proposals]);
  const [filter, setFilter] = useState<ProposalKind | 'all'>('all');
  const [queue, setQueue] = useState(emptyQueue);
  const visible = useMemo(() => filterByKind(sorted, filter), [sorted, filter]);
  const [selectedId, setSelectedId] = useState<string | null>(sorted[0]?.id ?? null);
  const [editing, setEditing] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [announce, setAnnounce] = useState('');

  const selected = visible.find((p) => p.id === selectedId) ?? visible[0] ?? null;
  const decision = selected ? queue.decisions[selected.id] : undefined;
  const open = pendingCount(sorted, queue);

  const apply = useCallback(
    (p: Proposal, input: DecisionInput) => {
      try {
        const next = decide(queue, p, input);
        setQueue(next);
        setEditing(null);
        setAnnounce(`${OUTCOME_LABEL[input.outcome]}: ${p.title}. Press Z to undo.`);
        const nextPending = visible.find((v) => v.id !== p.id && !next.decisions[v.id]);
        if (nextPending) setSelectedId(nextPending.id);
      } catch (e) {
        setAnnounce(e instanceof Error ? e.message : 'That decision is not allowed');
      }
    },
    [queue, visible],
  );

  const undoLast = useCallback(() => {
    const last = queue.history[queue.history.length - 1];
    if (!last) return;
    setQueue(undo(queue));
    setSelectedId(last);
    setAnnounce('Undone. The proposal is back in the queue.');
  }, [queue]);

  const actionsRef = useRef({ apply, undoLast, selected, decision });
  actionsRef.current = { apply, undoLast, selected, decision };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const { apply: act, undoLast: back, selected: sel, decision: dec } = actionsRef.current;
      const key = e.key.toLowerCase();
      if (key === 'j' || key === 'k') {
        setSelectedId((cur) =>
          moveSelection(
            visible.map((v) => v.id),
            cur,
            key === 'j' ? 1 : -1,
          ),
        );
      } else if (key === 'z') {
        back();
      } else if (sel && !dec && key === 'a') {
        if (isBlocked(sel)) setOverrideOpen(true);
        else act(sel, { outcome: 'approved' });
      } else if (sel && !dec && key === 'r') {
        act(sel, { outcome: 'rejected' });
      } else if (sel && !dec && key === 'e' && sel.draft !== undefined && !isBlocked(sel)) {
        setEditing(sel.id);
      } else {
        return;
      }
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible]);

  return (
    <div className="flex flex-col gap-5">
      {representative ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Representative data. The approvals service is not connected yet, so these proposals are
          samples and your decisions stay in this browser tab. Nothing is sent.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Show"
          className="flex flex-wrap gap-1 rounded-lg bg-card p-1 shadow-card"
        >
          {FILTERS.map((f) => {
            const count = pendingCount(filterByKind(sorted, f.value), queue);
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'min-h-target rounded-md px-3 text-sm transition-colors duration-fast',
                  filter === f.value
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label} <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{open}</span> waiting
          <span className="hidden md:inline">
            {' · '}
            <Kbd>J</Kbd> <Kbd>K</Kbd> move <Kbd>A</Kbd> approve <Kbd>E</Kbd> edit <Kbd>R</Kbd>{' '}
            reject <Kbd>Z</Kbd> undo
          </span>
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section
          aria-label="Proposals"
          className="self-start overflow-hidden rounded-xl bg-card shadow-card"
        >
          {visible.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nothing in this view.</p>
          ) : (
            <ul role="list" className="divide-y divide-border">
              {visible.map((p) => {
                const d = queue.decisions[p.id];
                const isSel = p.id === selected?.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      aria-current={isSel ? 'true' : undefined}
                      onClick={() => setSelectedId(p.id)}
                      className={cn(
                        'flex w-full min-h-target flex-col gap-1 px-4 py-3 text-left transition-colors duration-fast',
                        isSel ? 'bg-accent' : 'hover:bg-muted',
                        d && 'opacity-60',
                      )}
                    >
                      <span className="flex items-center justify-between gap-2 text-caption">
                        <span className="font-semibold text-agent">{p.agent} agent</span>
                        <span
                          className={cn(
                            isBlocked(p) && !d ? 'text-danger' : 'text-muted-foreground',
                          )}
                        >
                          {d ? OUTCOME_LABEL[d.outcome] : p.dueLabel}
                        </span>
                      </span>
                      <span className={cn('text-sm', d ? 'line-through' : 'font-medium')}>
                        {p.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {selected ? (
          <div className="flex min-w-0 flex-col gap-5">
            <article
              aria-labelledby="proposal-title"
              className="flex flex-col gap-4 rounded-xl bg-card p-5 shadow-card sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-caption">
                <span className="rounded-sm bg-agent-soft px-2 py-0.5 font-semibold text-agent-foreground">
                  Drafted by the {selected.agent} agent
                </span>
                <span className="text-muted-foreground">{selected.dueLabel}</span>
              </div>
              <h2 id="proposal-title" className="font-display text-[22px] leading-7">
                {selected.title}
              </h2>
              <p className="text-sm text-muted-foreground">{selected.summary}</p>

              <ul role="list" className="flex flex-col gap-2">
                {selected.checks.map((c) => (
                  <CheckRow key={c.title} check={c} />
                ))}
              </ul>

              {selected.draft !== undefined ? (
                editing === selected.id ? (
                  <DraftEditor
                    initial={queue.decisions[selected.id]?.draft ?? selected.draft}
                    onCancel={() => setEditing(null)}
                    onSave={(draft) => apply(selected, { outcome: 'edited', draft })}
                  />
                ) : (
                  <blockquote className="border-l-2 border-agent-border pl-4 text-sm">
                    {decision?.draft ?? selected.draft}
                  </blockquote>
                )
              ) : null}

              <p className="text-sm">
                <span className="text-muted-foreground">If approved, this goes </span>
                {selected.destination}.
              </p>

              {decision ? (
                <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
                  <Icon name={decision.outcome === 'rejected' ? 'x' : 'check'} />
                  <span className="flex-1">
                    {OUTCOME_LABEL[decision.outcome]}
                    {decision.reason ? `. Reason: “${decision.reason}”` : ''}
                  </span>
                  <Button variant="outline" size="sm" onClick={undoLast}>
                    Undo
                  </Button>
                </div>
              ) : editing === selected.id ? null : (
                <div className="flex flex-wrap gap-2">
                  {isBlocked(selected) ? (
                    <Button onClick={() => setOverrideOpen(true)}>Override and approve…</Button>
                  ) : (
                    <Button onClick={() => apply(selected, { outcome: 'approved' })}>
                      {selected.approveLabel}
                    </Button>
                  )}
                  {selected.draft !== undefined && !isBlocked(selected) ? (
                    <Button variant="outline" onClick={() => setEditing(selected.id)}>
                      Edit draft
                    </Button>
                  ) : null}
                  <Button variant="ghost" onClick={() => apply(selected, { outcome: 'rejected' })}>
                    Reject
                  </Button>
                </div>
              )}
            </article>

            {selected.evidence.length ? (
              <section
                aria-labelledby="evidence"
                className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="evidence" className="text-heading">
                    Evidence
                  </h2>
                  <span className="text-caption text-muted-foreground">
                    “Not found” means not in the sources. You decide.
                  </span>
                </div>
                <ul role="list" className="divide-y divide-border">
                  {selected.evidence.map((ev) => (
                    <li key={ev.requirement} className="flex flex-col gap-1 py-3">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span className={ev.status === 'found' ? 'text-success' : 'text-warning'}>
                          <Icon name={ev.status === 'found' ? 'check' : 'alert'} size={14} />
                        </span>
                        {ev.requirement}
                        {ev.mustHave ? (
                          <span className="text-caption font-normal text-muted-foreground">
                            Must-have
                          </span>
                        ) : null}
                      </span>
                      {ev.quote ? (
                        <q className="pl-6 text-sm">{ev.quote}</q>
                      ) : (
                        <span className="pl-6 text-sm text-muted-foreground">Not found</span>
                      )}
                      <span className="pl-6 text-caption text-muted-foreground">{ev.source}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>

      <OverrideDialog
        open={overrideOpen && !!selected}
        proposal={selected}
        onClose={() => setOverrideOpen(false)}
        onConfirm={(reason) => {
          if (selected) apply(selected, { outcome: 'overridden', reason });
          setOverrideOpen(false);
        }}
      />

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded-sm border border-border bg-card px-1.5 font-mono text-caption">
      {children}
    </kbd>
  );
}

function CheckRow({ check }: { check: Check }) {
  const tone = { pass: 'text-success', warn: 'text-warning', fail: 'text-danger' }[check.status];
  const icon = check.status === 'pass' ? 'check' : check.status === 'warn' ? 'alert' : 'x';
  return (
    <li className="flex items-start gap-2 text-sm">
      <span
        className={cn('mt-0.5', tone)}
        aria-label={
          check.status === 'fail' ? 'Failed' : check.status === 'warn' ? 'Warning' : 'Passed'
        }
      >
        <Icon name={icon} size={14} />
      </span>
      <span className="flex-1">
        <span className={check.status === 'fail' ? 'font-semibold text-danger' : ''}>
          {check.title}
        </span>
        {check.detail ? <span className="text-muted-foreground"> · {check.detail}</span> : null}
      </span>
    </li>
  );
}

function DraftEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (draft: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="draft" className="text-label">
        Edit the draft
      </label>
      <textarea
        id="draft"
        autoFocus
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="rounded-lg border border-input bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex gap-2">
        <Button disabled={!text.trim()} onClick={() => onSave(text)}>
          Approve edited draft
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function OverrideDialog({
  open,
  proposal,
  onClose,
  onConfirm,
}: {
  open: boolean;
  proposal: Proposal | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setReason('');
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);
  const failed = proposal?.checks.filter((c) => c.status === 'fail') ?? [];
  const ok = reason.trim().length >= OVERRIDE_MIN_CHARS;
  return (
    <dialog
      ref={ref}
      aria-labelledby="override-title"
      onCancel={onClose}
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      className="w-[min(480px,calc(100vw-32px))] rounded-xl bg-popover p-6 text-popover-foreground shadow-raised backdrop:bg-foreground/20"
    >
      <h2 id="override-title" className="text-title">
        Override the failed check?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {failed.map((c) => `${c.title}${c.detail ? ` (${c.detail})` : ''}`).join('; ')}. Your
        manager sees this reason in the audit log.
      </p>
      <label htmlFor="override-reason" className="mt-4 block text-label">
        Reason
      </label>
      <textarea
        id="override-reason"
        rows={3}
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        aria-describedby="override-hint"
        className="mt-1 w-full rounded-lg border border-input bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p id="override-hint" className="mt-1 text-caption text-muted-foreground">
        At least {OVERRIDE_MIN_CHARS} characters. Example: client agreed to a $102/hr bill rate on
        today’s call.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!ok} onClick={() => onConfirm(reason)}>
          Override and approve
        </Button>
      </div>
    </dialog>
  );
}
