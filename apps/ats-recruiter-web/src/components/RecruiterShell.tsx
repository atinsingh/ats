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
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-xs uppercase tracking-wide text-slate-500">Jobocate</span>
            <span className="text-base">ATS</span>
          </Link>
          <nav className="hidden gap-1 text-sm font-medium md:flex" aria-label="Recruiter">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/recruiter/jobs/new"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            + New job
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
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
    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Backend not connected</p>
      <p className="mt-1">
        Set <code className="rounded bg-white px-1">{envName}</code>
        {example ? <> (e.g. <code className="rounded bg-white px-1">{example}</code>)</> : null}
        {' '}and reload to use this screen.
      </p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
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
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {hint ? <p className="mt-2 text-sm text-slate-600">{hint}</p> : null}
      {cta ? <div className="mt-4 flex justify-center">{cta}</div> : null}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const palette: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    PUBLISHED: 'bg-emerald-100 text-emerald-800',
    CLOSED: 'bg-slate-200 text-slate-700',
    ARCHIVED: 'bg-slate-200 text-slate-700',
    APPLIED: 'bg-blue-100 text-blue-800',
    SCREENING: 'bg-indigo-100 text-indigo-800',
    SHORTLISTED: 'bg-violet-100 text-violet-800',
    INTERVIEW_SCHEDULED: 'bg-amber-100 text-amber-800',
    INTERVIEWED: 'bg-amber-200 text-amber-900',
    OFFERED: 'bg-emerald-100 text-emerald-800',
    HIRED: 'bg-emerald-200 text-emerald-900',
    REJECTED: 'bg-rose-100 text-rose-800',
    WITHDRAWN: 'bg-slate-100 text-slate-700',
    EXPIRED: 'bg-slate-100 text-slate-700',
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        palette[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {status.replace('_', ' ').toLowerCase()}
    </span>
  );
}
