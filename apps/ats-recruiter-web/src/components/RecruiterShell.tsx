import Link from 'next/link';
import type { ReactNode } from 'react';
import { RecruiterAppShell } from './RecruiterAppShell';

export function RecruiterShell({
  title,
  subtitle,
  actions,
  hideNewJob = false,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Hide the New job button, e.g. on the New job page itself. */
  hideNewJob?: boolean;
  children: ReactNode;
}) {
  return (
    <RecruiterAppShell>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[28px] leading-9 tracking-tight sm:text-[32px] sm:leading-10">
              {title}
            </h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {actions}
            {hideNewJob ? null : (
              <Link
                href="/recruiter/jobs/new"
                className="inline-flex h-control items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors duration-fast hover:bg-primary-hover"
              >
                New job
              </Link>
            )}
          </div>
        </div>
        <div className="mt-6">{children}</div>
      </main>
    </RecruiterAppShell>
  );
}

export function MissingConfig({ envName, example }: { envName: string; example?: string }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm text-warning"
    >
      <p className="font-semibold">Backend not connected</p>
      <p className="mt-1">
        Set <code className="rounded bg-card px-1">{envName}</code>
        {example ? (
          <>
            {' '}
            (e.g. <code className="rounded bg-card px-1">{example}</code>)
          </>
        ) : null}{' '}
        and reload to use this screen.
      </p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
    >
      {message}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  cta,
}: {
  title: string;
  hint?: string;
  cta?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-input bg-card p-10 text-center text-muted-foreground">
      <p className="text-base font-semibold text-foreground">{title}</p>
      {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
      {cta ? <div className="mt-4 flex justify-center">{cta}</div> : null}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const palette: Record<string, string> = {
    DRAFT: 'bg-muted text-foreground',
    PUBLISHED: 'bg-success-soft text-success',
    CLOSED: 'bg-muted text-foreground',
    ARCHIVED: 'bg-muted text-foreground',
    APPLIED: 'bg-info-soft text-info',
    SCREENING: 'bg-muted text-foreground',
    SHORTLISTED: 'bg-muted text-foreground',
    INTERVIEW_SCHEDULED: 'bg-warning-soft text-warning',
    INTERVIEWED: 'bg-warning-soft text-warning',
    OFFERED: 'bg-success-soft text-success',
    HIRED: 'bg-success-soft text-success',
    REJECTED: 'bg-danger-soft text-danger',
    WITHDRAWN: 'bg-muted text-foreground',
    EXPIRED: 'bg-muted text-foreground',
  };
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs font-semibold capitalize ${
        palette[status] ?? 'bg-muted text-foreground'
      }`}
    >
      {status.replace('_', ' ').toLowerCase()}
    </span>
  );
}
