import Link from 'next/link';
import { cn } from '@jobocate/ui';

import { RecruiterShell } from '../../../components/RecruiterShell';
import { disconnected, formatCost, formatRunTime } from '../../../lib/agents/agents';
import {
  representativeAgents,
  representativeConnections,
  representativeRuns,
} from '../../../lib/agents/representative';
import {
  attentionList,
  clock,
  decisionSummary,
  decisionsHeadline,
  greeting,
  interviewsToday,
  longDate,
  sampleNote,
  type Attention,
  type Tone,
} from '../../../lib/home/home';
import { businessDays, localDay, zonedToIso } from '../../../lib/interviews/interviews';
import { representativeInterviews } from '../../../lib/interviews/representative';
import { placementFlags, placementTotals } from '../../../lib/placements/placements';
import { representativePlacements } from '../../../lib/placements/representative';
import {
  loadAgenda,
  loadLiveProposals,
  loadPlacements,
  loadSubmittals,
} from '../../../lib/live/loaders';
import { readRecruiterConfig } from '../../../lib/recruiter-config';
import { isBlocked } from '../../../lib/review/queue';
import { representativeProposals } from '../../../lib/review/representative';
import { followUpDue, submittalStats } from '../../../lib/submittals/submittals';
import { representativeSubmittals } from '../../../lib/submittals/representative';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';

const TONE: Record<Tone, string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
};

function Tile({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: string;
  note: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="rounded-xl bg-card p-4 shadow-card outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-[28px] leading-9 tabular-nums">{value}</p>
      <p className="text-caption text-muted-foreground">{note}</p>
    </Link>
  );
}

export default async function CommandCenterPage() {
  // Summarises the same data each module shows: real wherever its service answers, labelled
  // samples otherwise. Agent runs and connections have no service yet, so they stay samples.
  // It only links to the modules; every decision is still made in the Review queue.
  const cfg = readRecruiterConfig();
  const [liveProposals, liveAgenda, liveSubmittals, livePlacements] = await Promise.all([
    loadLiveProposals(cfg),
    loadAgenda(cfg),
    loadSubmittals(cfg),
    loadPlacements(cfg),
  ]);
  const now = new Date();
  const today = localDay(now, FIRM_TIME_ZONE);
  const days = businessDays(now, FIRM_TIME_ZONE, 5);
  const toIso = (day: string, time: string) => zonedToIso(day, time, FIRM_TIME_ZONE);
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  const at = (daysAgo: number, time: string) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    const iso = toIso(d.toISOString().slice(0, 10), time);
    return iso > now.toISOString() ? now.toISOString() : iso;
  };

  const proposals = liveProposals ?? representativeProposals(now);
  const decisions = decisionSummary(proposals, now);
  const interviews = interviewsToday(
    liveAgenda ?? representativeInterviews(days, toIso, now),
    now,
    FIRM_TIME_ZONE,
  );
  const submittals = liveSubmittals ?? representativeSubmittals(now);
  const subStats = submittalStats(submittals, now);
  const placements = livePlacements ?? representativePlacements(today);
  const placeTotals = placementTotals(placements, today);
  const overnight = representativeRuns(at)
    .filter((r) => now.getTime() - Date.parse(r.at) <= 24 * 3_600_000)
    .sort((a, b) => b.at.localeCompare(a.at));

  const agentName = new Map(representativeAgents().map((a) => [a.id, a.name]));

  const attention = attentionList(
    disconnected(representativeConnections(ago)).map(
      (c): Attention => ({
        id: `conn-${c.id}`,
        tone: 'danger',
        title: `${c.name} is disconnected`,
        detail: c.held ?? c.use,
        href: '/recruiter/settings',
        at: c.since,
      }),
    ),
    proposals.filter(isBlocked).map(
      (p): Attention => ({
        id: `blocked-${p.id}`,
        tone: 'danger',
        title: p.title,
        detail: `Blocked by a failed check. ${p.dueLabel}.`,
        href: '/recruiter/review',
        at: p.dueAt,
      }),
    ),
    submittals
      .filter((s) => followUpDue(s, now))
      .map(
        (s): Attention => ({
          id: `follow-${s.id}`,
          tone: 'warning',
          title: `Follow up with ${s.client}`,
          detail: `${s.candidate} for ${s.job}: no client reply in over 3 business days`,
          href: '/recruiter/submittals',
        }),
      ),
    placements.flatMap((p) =>
      placementFlags(p, today)
        .filter((f) => f.tone === 'warning')
        .map(
          (f): Attention => ({
            id: `place-${p.id}-${f.label}`,
            tone: 'warning',
            title: `${p.contractor} at ${p.client}`,
            detail: f.label,
            href: '/recruiter/placements',
          }),
        ),
    ),
  );

  const next = decisions.next;
  const note = sampleNote([
    { label: 'the Review queue', live: liveProposals !== null },
    { label: 'interviews', live: liveAgenda !== null },
    { label: 'submittals', live: liveSubmittals !== null },
    { label: 'placements', live: livePlacements !== null },
    { label: 'agent activity', live: false },
  ]);

  return (
    <RecruiterShell hideNewJob title="Command center" subtitle={longDate(now, FIRM_TIME_ZONE)}>
      <div className="flex flex-col gap-5">
        {note ? (
          <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
            {note}
          </p>
        ) : null}

        <section
          aria-labelledby="decisions-title"
          className="grid gap-5 rounded-xl bg-card p-5 shadow-card sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        >
          <div className="flex flex-col gap-3">
            <h2 id="decisions-title" className="font-display text-[28px] leading-9">
              {greeting(now, FIRM_TIME_ZONE)}. {decisionsHeadline(decisions.total)}
            </h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground tabular-nums">
                  {decisions.urgent}
                </span>{' '}
                due within 3 hours
              </li>
              <li>
                <span className="font-semibold text-foreground tabular-nums">
                  {decisions.blocked}
                </span>{' '}
                blocked by a check
              </li>
              <li>All prepared by agents, decided by you</li>
            </ul>
            <div className="mt-1 flex flex-wrap gap-2">
              <Link
                href="/recruiter/review"
                prefetch={false}
                className="inline-flex min-h-target items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Start review
              </Link>
              <Link
                href="/recruiter/inbox"
                prefetch={false}
                className="inline-flex min-h-target items-center rounded-lg px-4 text-sm font-semibold shadow-card hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Open inbox
              </Link>
            </div>
          </div>
          {next ? (
            <div className="flex flex-col gap-2 rounded-lg bg-muted p-4">
              <p className="text-caption font-semibold text-muted-foreground">
                Up next · {next.dueLabel}
              </p>
              <p className="font-medium">{next.title}</p>
              <p className="text-sm text-muted-foreground">{next.summary}</p>
              <p className="text-caption text-muted-foreground">
                Drafted by the {next.agent} agent. Goes {next.destination} once you approve.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Your Review queue is clear.</p>
          )}
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Tile
            label="Interviews today"
            value={String(interviews.list.length)}
            note={
              interviews.next
                ? `Next at ${clock(interviews.next.startsAt, FIRM_TIME_ZONE)}`
                : 'None left today'
            }
            href="/recruiter/interviews"
          />
          <Tile
            label="Submittals this week"
            value={String(subStats.submittedThisWeek)}
            note={`${subStats.waitingOnClients} waiting on clients`}
            href="/recruiter/submittals"
          />
          <Tile
            label="Contractors on assignment"
            value={String(placeTotals.onAssignment)}
            note={`${placeTotals.endingSoon} ending within 30 days`}
            href="/recruiter/placements"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section
            aria-labelledby="attention-title"
            className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
          >
            <h2 id="attention-title" className="font-display text-[22px] leading-7">
              Needs your attention
            </h2>
            {attention.length ? (
              <ul className="divide-y divide-border">
                {attention.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={a.href}
                      prefetch={false}
                      className="flex items-start gap-3 rounded-md py-3 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        aria-hidden="true"
                        className={cn('mt-1.5 size-2 shrink-0 rounded-full', TONE[a.tone])}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">
                          <span className="sr-only">
                            {a.tone === 'danger' ? 'Urgent: ' : 'Soon: '}
                          </span>
                          {a.title}
                        </span>
                        <span className="block text-caption text-muted-foreground">{a.detail}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing needs you outside the queue.</p>
            )}
          </section>

          <div className="flex min-w-0 flex-col gap-5">
            <section
              aria-labelledby="schedule-title"
              className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
            >
              <h2 id="schedule-title" className="font-display text-[22px] leading-7">
                Today&apos;s interviews
              </h2>
              {interviews.list.length ? (
                <ol className="flex flex-col gap-2">
                  {interviews.list.map((i) => (
                    <li key={i.id} className="flex gap-3 text-sm">
                      <span className="w-16 shrink-0 tabular-nums text-muted-foreground">
                        {clock(i.startsAt, FIRM_TIME_ZONE)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium">{i.title}</span>
                        <span className="block text-caption text-muted-foreground">
                          {i.detail} · {i.medium}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No interviews today.</p>
              )}
            </section>

            <section
              aria-labelledby="overnight-title"
              className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="overnight-title" className="font-display text-[22px] leading-7">
                  Agents in the last 24 hours
                </h2>
                <Link
                  href="/recruiter/agents"
                  prefetch={false}
                  className="text-sm font-semibold underline-offset-4 hover:underline"
                >
                  All agents
                </Link>
              </div>
              {overnight.length ? (
                <ul className="flex flex-col gap-2">
                  {overnight.map((r) => (
                    <li key={r.id} className="text-sm">
                      <span className="block">
                        <span className="font-medium">{agentName.get(r.agentId) ?? 'Agent'}: </span>
                        <span className={cn(r.failed && 'font-semibold text-danger')}>
                          {r.output}
                        </span>
                      </span>
                      <span className="block text-caption text-muted-foreground">
                        {formatRunTime(r.at, now, FIRM_TIME_ZONE)} · {r.result} ·{' '}
                        {formatCost(r.costCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No agent runs in the last day.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </RecruiterShell>
  );
}
