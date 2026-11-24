import Link from 'next/link';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/recruiter/dashboard', label: 'Dashboard' },
  { href: '/recruiter/jobs', label: 'Jobs' },
  { href: '/recruiter/pipeline', label: 'Pipeline' },
];

export function RecruiterShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Jobocate</span>
            <span className="text-base">ATS</span>
          </Link>
          <nav className="hidden gap-1 text-sm font-medium md:flex" aria-label="Recruiter">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-md px-3 py-2 text-foreground hover:bg-muted"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/recruiter/jobs/new"
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            + New job
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <div className="mt-6">{children}</div>
      </main>
    </div>
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
