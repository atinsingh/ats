'use client';

import { useState } from 'react';
import { Button, cn } from '@jobocate/ui';

import {
  QUIET_END_HOUR,
  QUIET_START_HOUR,
  STOP_LABEL,
  fillTemplate,
  sequenceStats,
  type Enrollee,
  type NextStep,
  type Sequence,
  type Template,
} from '../../lib/sequences/sequences';

const CHANNEL = { email: 'Email', sms: 'SMS' } as const;

const hour12 = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`;

export function SequencesBoard({
  sequence,
  enrollees,
  nextSteps,
  pausedLabel,
  templates,
  sampleVars,
  dailyCap,
  timeZone,
  renderedAt,
  representative,
}: {
  sequence: Sequence;
  enrollees: Enrollee[];
  /** Next step per enrollee id, computed on the server for the running sequence. */
  nextSteps: Record<string, NextStep>;
  pausedLabel: string;
  templates: Template[];
  sampleVars: Record<string, string>;
  dailyCap: number;
  timeZone: string;
  /** ISO time the page was rendered, so server and client agree. */
  renderedAt: string;
  representative: boolean;
}) {
  const [paused, setPaused] = useState(sequence.paused);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [status, setStatus] = useState('');
  const stats = sequenceStats(enrollees);
  const template = templates.find((t) => t.id === templateId);
  const preview = template ? fillTemplate(template.body, sampleVars) : null;

  const when = (iso: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));

  const describe = (e: Enrollee): { text: string; tone: string } => {
    const n = nextSteps[e.id];
    if (!n) return { text: '–', tone: '' };
    if (n.kind === 'stopped')
      return { text: `Stopped: ${STOP_LABEL[n.reason]}`, tone: 'text-muted-foreground' };
    if (paused) return { text: pausedLabel, tone: 'text-muted-foreground' };
    if (n.kind === 'paused') return { text: pausedLabel, tone: 'text-muted-foreground' };
    if (n.kind === 'done') return { text: 'All steps sent', tone: 'text-muted-foreground' };
    return {
      text: `${CHANNEL[n.step.channel]}, ${Date.parse(n.at) - Date.parse(renderedAt) < 60_000 ? 'now' : when(n.at)}${n.needsApproval ? ' · needs your approval' : ' · goes out on its own'}`,
      tone: n.needsApproval ? 'font-medium' : '',
    };
  };

  return (
    <div className="flex flex-col gap-5">
      {representative ? (
        <p role="note" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Representative data. Messaging and consent records are not connected yet, so these people
          and templates are samples and nothing is sent from this page.
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section
          aria-labelledby="sequence-title"
          className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="sequence-title" className="font-display text-[22px] leading-7">
                Sequence: {sequence.name}
              </h2>
              <p className="text-caption text-muted-foreground">
                {stats.total} people in it. {stats.active} active, {stats.replied} replied,{' '}
                {stats.optedOut} opted out.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-target"
              onClick={() => {
                setPaused((p) => !p);
                setStatus(
                  paused
                    ? 'Sequence resumed. Scheduled steps go out at their times.'
                    : 'Sequence paused. Nothing goes out until you resume it.',
                );
              }}
            >
              {paused ? 'Resume' : 'Pause'}
            </Button>
          </div>
          <ol className="divide-y divide-border">
            {sequence.steps.map((s, i) => (
              <li key={i} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <span className="min-w-0">
                  <span className="block font-medium">
                    Day {s.day}, {CHANNEL[s.channel]}
                  </span>
                  <span className="block text-caption text-muted-foreground">
                    {s.summary}
                    {s.channel === 'sms' ? '. Only for people who gave SMS consent' : ''}
                  </span>
                </span>
                <span
                  className={cn(
                    'rounded-sm px-2 py-0.5 text-caption font-semibold',
                    i === 0 ? 'bg-info-soft text-info' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {i === 0 ? 'Always needs approval' : 'Auto after first approval'}
                </span>
              </li>
            ))}
            <li className="py-3">
              <span className="block font-medium">Stops when</span>
              <span className="block text-caption text-muted-foreground">
                They reply, opt out, are submitted elsewhere, or the job closes
              </span>
            </li>
          </ol>
          <p role="status" className="min-h-5 text-caption text-muted-foreground">
            {status}
          </p>
        </section>

        <section
          aria-labelledby="rules-title"
          className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
        >
          <div>
            <h2 id="rules-title" className="font-display text-[22px] leading-7">
              Sending rules
            </h2>
            <p className="text-caption text-muted-foreground">
              Set by your firm&apos;s compliance team. They apply to every sequence and every desk.
            </p>
          </div>
          <ul className="flex flex-col gap-3 text-sm">
            <li>
              <span className="block font-medium">Consent basis recorded per contact</span>
              <span className="block text-caption text-muted-foreground">
                CASL: express, or implied with the date it lapses. No consent on a channel, no step
                on it.
              </span>
            </li>
            <li>
              <span className="block font-medium">Unsubscribe in every email</span>
              <span className="block text-caption text-muted-foreground">
                An opt-out stops every sequence for that person at once.
              </span>
            </li>
            <li>
              <span className="block font-medium">Quiet hours</span>
              <span className="block text-caption text-muted-foreground">
                Nothing goes out before {hour12(QUIET_END_HOUR)} or after {hour12(QUIET_START_HOUR)}
                ; those sends wait for {hour12(QUIET_END_HOUR)}.
              </span>
            </li>
            <li>
              <span className="block font-medium">Daily cap per mailbox</span>
              <span className="block text-caption text-muted-foreground">
                {dailyCap} new contacts a day.
              </span>
            </li>
          </ul>
        </section>
      </div>

      <section
        aria-labelledby="people-title"
        className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 shadow-card sm:p-6"
      >
        <h2 id="people-title" className="font-display text-[22px] leading-7">
          People in this sequence
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">
              Each person&apos;s consent and the next step the sequence would take.
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-caption text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Person
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Can contact by
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Next step
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrollees.map((e) => {
                const d = describe(e);
                return (
                  <tr key={e.id}>
                    <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium">
                      {e.name}
                    </th>
                    <td className="px-3 py-2">
                      {e.consent.length ? e.consent.map((c) => CHANNEL[c]).join(', ') : 'None'}
                    </td>
                    <td className={cn('px-3 py-2', d.tone)}>{d.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section
        aria-labelledby="templates-title"
        className="grid min-w-0 gap-5 rounded-xl bg-card p-5 shadow-card sm:p-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
      >
        <div className="flex min-w-0 flex-col gap-3">
          <h2 id="templates-title" className="font-display text-[22px] leading-7">
            Templates
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <caption className="sr-only">Templates, with sends and reply rate.</caption>
              <thead>
                <tr className="border-b border-border text-left text-caption text-muted-foreground">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Template
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Used for
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Sent, 30 days
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Reply rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {templates.map((t) => (
                  <tr key={t.id} className={cn(t.id === templateId && 'bg-muted')}>
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      <button
                        type="button"
                        aria-pressed={t.id === templateId}
                        onClick={() => setTemplateId(t.id)}
                        className="min-h-target rounded-md text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {t.name}
                      </button>
                    </th>
                    <td className="px-3 py-2">{t.usedFor}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{t.sent30d}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {t.replyRate === null ? '–' : `${Math.round(t.replyRate * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {template && preview ? (
          <div className="flex min-w-0 flex-col gap-2" aria-labelledby="preview-title">
            <h3 id="preview-title" className="text-sm font-semibold">
              Preview for a sample person
            </h3>
            <blockquote className="whitespace-pre-wrap border-l-2 border-border pl-3 text-sm">
              {preview.text}
            </blockquote>
            {preview.missing.length ? (
              <p className="text-caption font-semibold text-danger">
                Can&apos;t send: missing {preview.missing.map((m) => `{${m}}`).join(', ')}. A
                missing variable blocks sending.
              </p>
            ) : (
              <p className="text-caption text-success">Every variable is filled.</p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
