'use client';

import { useMemo, useState } from 'react';
import { Button, Icon, cn } from '@jobocate/ui';

import {
  CHANNEL_LABEL,
  filterConversations,
  formatWhen,
  lastMessage,
  replyBlockedReason,
  sortByLatest,
  toReplyProposal,
  unreadCount,
  type Channel,
  type Conversation,
} from '../../lib/inbox/inbox';
import { decide, emptyQueue, isBlocked, undo, type Decision } from '../../lib/review/queue';
import { CheckRow } from '../review/ReviewQueue';

const OUTCOME: Record<Decision['outcome'], string> = {
  approved: 'Reply approved',
  edited: 'Edited reply approved',
  rejected: 'Draft discarded',
  overridden: 'Overridden and approved',
};

const selectClass =
  'h-control rounded-lg bg-card px-3 text-sm shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function InboxBoard({
  conversations,
  now,
  timeZone,
  representative,
}: {
  conversations: Conversation[];
  /** ISO time the page was rendered, so server and client agree. */
  now: string;
  /** The firm's time zone, so server and client format times the same way. */
  timeZone: string;
  representative: boolean;
}) {
  const at = useMemo(() => new Date(now), [now]);
  const [channel, setChannel] = useState<Channel | 'all'>('all');
  const [from, setFrom] = useState<'all' | 'candidates' | 'clients'>('all');
  const sorted = useMemo(() => sortByLatest(conversations), [conversations]);
  const rows = useMemo(
    () => filterConversations(sorted, { channel, from }),
    [sorted, channel, from],
  );
  const [selectedId, setSelectedId] = useState(sorted[0]?.id ?? null);
  const [opened, setOpened] = useState<ReadonlySet<string>>(
    () => new Set(sorted[0] ? [sorted[0].id] : []),
  );
  const [queue, setQueue] = useState(emptyQueue);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [announce, setAnnounce] = useState('');

  const open = (id: string) => {
    setSelectedId(id);
    setOpened((s) => (s.has(id) ? s : new Set([...s, id])));
  };

  const convo = rows.find((c) => c.id === selectedId) ?? rows[0] ?? null;
  const unread = unreadCount(conversations, opened);
  const proposal = convo ? toReplyProposal(convo) : null;
  const decision = proposal ? queue.decisions[proposal.id] : undefined;
  const blockedReason = convo ? replyBlockedReason(convo) : null;
  const text =
    convo && convo.suggestion ? (decision?.draft ?? edits[convo.id] ?? convo.suggestion.draft) : '';

  const act = (kind: 'send' | 'discard') => {
    if (!convo || !proposal || !convo.suggestion) return;
    try {
      const changed = text.trim() !== convo.suggestion.draft.trim();
      const next = decide(
        queue,
        proposal,
        kind === 'discard'
          ? { outcome: 'rejected' }
          : changed
            ? { outcome: 'edited', draft: text }
            : { outcome: 'approved' },
      );
      setQueue(next);
      setAnnounce(`${OUTCOME[next.decisions[proposal.id]!.outcome]}: ${convo.who}`);
    } catch (e) {
      setAnnounce(e instanceof Error ? e.message : 'That decision is not allowed');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {representative ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Representative data. Your mailbox and SMS number are not connected yet, so these
          conversations are samples and your decisions stay in this browser tab. Nothing is sent.
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{unread}</span> unread
        </p>
        <label className="flex items-center gap-2 text-sm sm:ml-auto">
          <span className="text-muted-foreground">Channel</span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel | 'all')}
            className={selectClass}
          >
            <option value="all">All</option>
            {(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">From</span>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value as 'all' | 'candidates' | 'clients')}
            className={selectClass}
          >
            <option value="all">Anyone</option>
            <option value="candidates">Candidates</option>
            <option value="clients">Clients</option>
          </select>
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,260px)]">
        <section
          aria-label="Conversations"
          className="self-start overflow-hidden rounded-xl bg-card shadow-card"
        >
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No conversations in this view.</p>
          ) : (
            <ul role="list" className="divide-y divide-border">
              {rows.map((c) => {
                const isUnread = c.unread && !opened.has(c.id);
                const last = lastMessage(c);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={c.id === convo?.id}
                      onClick={() => open(c.id)}
                      className={cn(
                        'flex min-h-target w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors duration-fast',
                        c.id === convo?.id ? 'bg-accent' : 'hover:bg-muted',
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'flex items-center gap-2 text-sm',
                            isUnread && 'font-semibold',
                          )}
                        >
                          {isUnread ? (
                            <span
                              aria-hidden="true"
                              className="h-2 w-2 shrink-0 rounded-full bg-agent"
                            />
                          ) : null}
                          {c.who}
                          {isUnread ? <span className="sr-only">, unread</span> : null}
                        </span>
                        <span className="text-caption text-muted-foreground">
                          {last ? formatWhen(last.at, at, timeZone) : 'Draft'}
                        </span>
                      </span>
                      <span className="truncate text-sm">{c.subject}</span>
                      <span className="text-caption text-muted-foreground">
                        {c.context} · {CHANNEL_LABEL[c.channel]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {convo ? (
          <>
            <article
              aria-labelledby="thread-title"
              className="flex min-w-0 flex-col gap-4 rounded-xl bg-card p-5 shadow-card sm:p-6"
            >
              <div>
                <h2 id="thread-title" className="font-display text-[22px] leading-7">
                  {convo.subject}
                </h2>
                <p className="text-caption text-muted-foreground">
                  {convo.who} · {CHANNEL_LABEL[convo.channel]}
                </p>
              </div>

              {convo.messages.length ? (
                <ol className="flex flex-col gap-3">
                  {convo.messages.map((m, i) => (
                    <li
                      key={i}
                      className={cn(
                        'max-w-[85%] rounded-lg px-4 py-3 text-sm',
                        m.from === 'you' ? 'self-end bg-muted' : 'self-start bg-accent',
                      )}
                    >
                      <p className="text-caption text-muted-foreground">
                        {m.from === 'you' ? 'You' : convo.who} · {formatWhen(m.at, at, timeZone)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              )}

              {proposal && convo.suggestion ? (
                <div className="flex flex-col gap-3 rounded-lg border border-agent-border p-4">
                  <span className="self-start rounded-sm bg-agent-soft px-2 py-0.5 text-caption font-semibold text-agent-foreground">
                    Reply drafted by the Outreach agent
                  </span>
                  {proposal.checks.length ? (
                    <ul role="list" className="flex flex-col gap-2">
                      {proposal.checks.map((c) => (
                        <CheckRow key={c.title} check={c} />
                      ))}
                    </ul>
                  ) : null}
                  {decision || isBlocked(proposal) ? (
                    <blockquote className="whitespace-pre-wrap border-l-2 border-agent-border pl-4 text-sm">
                      {text}
                    </blockquote>
                  ) : (
                    <>
                      <label htmlFor="reply-draft" className="sr-only">
                        Reply to {convo.who}
                      </label>
                      <textarea
                        id="reply-draft"
                        rows={4}
                        value={text}
                        onChange={(e) => setEdits((m) => ({ ...m, [convo.id]: e.target.value }))}
                        className="w-full rounded-lg border border-input bg-card p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </>
                  )}
                  <p className="text-caption text-muted-foreground">
                    Sends {proposal.destination}
                    <br />
                    {convo.suggestion.basis}
                  </p>
                  {decision ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
                      <Icon name={decision.outcome === 'rejected' ? 'x' : 'check'} />
                      <span className="flex-1">{OUTCOME[decision.outcome]}</span>
                      {queue.history[queue.history.length - 1] === proposal.id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-target"
                          onClick={() => {
                            setQueue(undo(queue));
                            setAnnounce(`Undone. The draft for ${convo.who} is back.`);
                          }}
                        >
                          Undo
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {isBlocked(proposal) ? null : (
                        <Button
                          className="min-h-target"
                          disabled={!text.trim()}
                          onClick={() => act('send')}
                        >
                          {proposal.approveLabel}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="min-h-target"
                        onClick={() => act('discard')}
                      >
                        Discard
                      </Button>
                    </div>
                  )}
                </div>
              ) : blockedReason ? (
                <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                  {blockedReason}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No draft yet. Reply from your mailbox; it links here automatically.
                </p>
              )}
            </article>

            <aside
              aria-label="Linked record"
              className="flex flex-col gap-3 self-start rounded-xl bg-card p-5 text-sm shadow-card lg:col-start-2 xl:col-start-auto"
            >
              <h3 className="font-semibold">{convo.who}</h3>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
                <dt className="text-muted-foreground">Job</dt>
                <dd>{convo.link?.job ?? '–'}</dd>
                <dt className="text-muted-foreground">Stage</dt>
                <dd>{convo.link?.stage ?? '–'}</dd>
                <dt className="text-muted-foreground">Consent</dt>
                <dd>
                  {convo.link?.consent
                    ? `${CHANNEL_LABEL[convo.link.consent.channel]}, ${formatWhen(convo.link.consent.at, at, timeZone)}`
                    : 'None recorded'}
                </dd>
                <dt className="text-muted-foreground">Owner</dt>
                <dd>{convo.link?.owner ?? '–'}</dd>
              </dl>
            </aside>
          </>
        ) : null}
      </div>
    </div>
  );
}
