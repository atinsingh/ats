'use client';

import { useMemo, useState } from 'react';
import { Button, Icon, cn } from '@jobocate/ui';

import {
  commonFree,
  formatDay,
  formatSlot,
  formatTime,
  inviteProposal,
  slotGrid,
  slotKey,
  summarizeScorecard,
  weekAgenda,
  type Attendee,
  type Interview,
  type InterviewStatus,
  type Scorecard,
  type Slot,
} from '../../lib/interviews/interviews';
import { decide, emptyQueue, undo } from '../../lib/review/queue';

const STATUS: Record<InterviewStatus, { label: string; tone: string }> = {
  confirmed: { label: 'Confirmed', tone: 'bg-success-soft text-success' },
  'reschedule-requested': { label: 'Reschedule asked', tone: 'bg-warning-soft text-warning' },
  'awaiting-confirmation': { label: 'Awaiting reply', tone: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Scheduled', tone: 'bg-muted text-foreground' },
  rescheduled: { label: 'Rescheduled', tone: 'bg-warning-soft text-warning' },
};

interface Meeting {
  id: string;
  title: string;
  minutes: number;
  medium: string;
  panel: string[];
}

export function InterviewsBoard({
  days,
  attendees,
  meeting,
  interviews,
  scorecard,
  now,
  timeZone,
  representative,
  liveAgenda = false,
}: {
  days: string[];
  attendees: Attendee[];
  meeting: Meeting;
  interviews: Interview[];
  scorecard: Scorecard;
  now: string;
  timeZone: string;
  representative: boolean;
  /** True when "This week" shows real interviews while the rest is still samples. */
  liveAgenda?: boolean;
}) {
  const at = useMemo(() => new Date(now), [now]);
  const grid = useMemo(
    () => slotGrid(days, attendees, at, timeZone),
    [days, attendees, at, timeZone],
  );
  const free = useMemo(() => commonFree(grid), [grid]);
  const agenda = useMemo(() => weekAgenda(interviews, at, timeZone), [interviews, at, timeZone]);
  const summary = summarizeScorecard(scorecard);
  const [picked, setPicked] = useState<Slot | null>(free[0] ?? null);
  const [queue, setQueue] = useState(emptyQueue);
  const [announce, setAnnounce] = useState('');

  const proposed = queue.history[queue.history.length - 1];
  const proposal = picked ? inviteProposal(picked, meeting) : null;

  return (
    <div className="flex flex-col gap-4">
      {representative && liveAgenda ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          This week shows real interviews. The time finder and the scorecard are still samples,
          because calendars and the scorecard form are not connected yet. Nothing is sent.
        </p>
      ) : representative ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Representative data. Calendars and the interview service are not connected yet, so these
          times and interviews are samples. Nothing is sent.
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <section
            aria-labelledby="finder-title"
            className="flex flex-col gap-4 rounded-xl bg-card p-5 shadow-card sm:p-6"
          >
            <span className="self-start rounded-sm bg-agent-soft px-2 py-0.5 text-caption font-semibold text-agent-foreground">
              Times found by the Scheduling agent
            </span>
            <h2 id="finder-title" className="font-display text-[22px] leading-7">
              Find a time: {meeting.title}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <caption className="sr-only">
                  Times everyone can make are buttons; other cells name who is busy.
                </caption>
                <thead>
                  <tr className="text-caption text-muted-foreground">
                    <td />
                    {days.map((d) => (
                      <th key={d} scope="col" className="px-1 pb-2 text-left font-semibold">
                        {formatDay(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((row) => (
                    <tr key={row[0]!.time}>
                      <th
                        scope="row"
                        className="whitespace-nowrap pr-2 text-left text-caption font-semibold text-muted-foreground"
                      >
                        {formatTime(row[0]!.time)}
                      </th>
                      {row.map((c) => {
                        const key = slotKey(c);
                        const isPicked = picked !== null && slotKey(picked) === key;
                        const open = !c.past && c.busy.length === 0;
                        return (
                          <td key={key} className="p-1">
                            {open ? (
                              <button
                                type="button"
                                aria-pressed={isPicked}
                                aria-label={`${formatSlot(c)}, everyone free`}
                                disabled={Boolean(proposed)}
                                onClick={() => setPicked(c)}
                                className={cn(
                                  'min-h-target w-full rounded-md px-2 text-caption font-semibold transition-colors duration-fast',
                                  isPicked
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-success-soft text-success hover:bg-success-soft/70',
                                )}
                              >
                                {isPicked ? 'Chosen' : 'Free'}
                              </button>
                            ) : (
                              <span className="flex min-h-target items-center px-2 text-caption text-muted-foreground">
                                {c.past ? 'Past' : `Busy: ${c.busy.join(', ')}`}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-caption text-muted-foreground">
              {attendees.map((a) => `${a.name} (${a.source})`).join(', ')}. {meeting.minutes}{' '}
              minutes, {meeting.medium}. {free.length} times work for everyone.
            </p>

            {proposed ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
                <Icon name="check" />
                <span className="flex-1">
                  Proposed {picked ? formatSlot(picked) : ''}. The invite goes from your calendar
                  once connected.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-target"
                  onClick={() => {
                    setQueue(undo(queue));
                    setAnnounce('Undone. Pick a time again.');
                  }}
                >
                  Undo
                </Button>
              </div>
            ) : proposal ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  className="min-h-target"
                  onClick={() => {
                    setQueue(decide(queue, proposal, { outcome: 'approved' }));
                    setAnnounce(`Proposed ${formatSlot(picked!)}.`);
                  }}
                >
                  {proposal.approveLabel}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-danger">
                No time works for everyone this week. Ask the panel for more availability.
              </p>
            )}
          </section>

          <section
            aria-labelledby="feedback-title"
            className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
          >
            <h2 id="feedback-title" className="font-display text-[22px] leading-7">
              Feedback: Tom B., round 1
            </h2>
            <p className="text-caption text-muted-foreground">
              From {scorecard.by}, {scorecard.channel}. Shown as the client wrote it.
            </p>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Overall</dt>
              <dd className="font-semibold">{scorecard.overall}</dd>
              {scorecard.scores.map((s) => (
                <div key={s.area} className="contents">
                  <dt className="text-muted-foreground">{s.area}</dt>
                  <dd>
                    <span
                      className={cn('tabular-nums', s.score <= 2 && 'font-semibold text-warning')}
                    >
                      {s.score} of 5
                    </span>
                    {s.note ? <span className="text-muted-foreground"> · “{s.note}”</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
            <blockquote className="border-l-2 border-border pl-4 text-sm">
              {scorecard.comment}
            </blockquote>
            <p className="text-caption text-muted-foreground">
              Average {summary.average} of 5.
              {summary.gaps.length ? ` Probe next round: ${summary.gaps.join(', ')}.` : ''}
            </p>
          </section>
        </div>

        <section
          aria-labelledby="week-title"
          className="flex flex-col gap-3 self-start rounded-xl bg-card p-5 shadow-card sm:p-6"
        >
          <h2 id="week-title" className="font-display text-[22px] leading-7">
            This week
          </h2>
          {agenda.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing booked in the next 7 days.</p>
          ) : (
            <ol className="divide-y divide-border">
              {agenda.map((i) => (
                <li key={i.id} className="flex flex-col gap-1 py-3 first:pt-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{i.title}</span>
                    <span
                      className={cn(
                        'shrink-0 rounded-sm px-2 py-0.5 text-caption font-semibold',
                        STATUS[i.status].tone,
                      )}
                    >
                      {STATUS[i.status].label}
                    </span>
                  </div>
                  <span className="text-caption text-muted-foreground">
                    {i.detail}. {i.dayLabel}, {i.timeLabel}, {i.medium}.
                  </span>
                  {i.note ? <span className="text-caption">{i.note}</span> : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
