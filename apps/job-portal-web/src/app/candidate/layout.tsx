import Link from 'next/link';

const tabs = [
  { href: '/candidate/profile', label: 'Profile' },
  { href: '/candidate/resumes', label: 'Resumes' },
  { href: '/candidate/applications', label: 'Applications' },
  { href: '/candidate/saved-jobs', label: 'Saved jobs' },
  { href: '/candidate/ai-tools', label: 'AI tools' },
];

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-landing-gradient text-jobocate-ink">
      <header className="border-b border-rose-100/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-jobocate-coral">
            JOBOCATE
          </Link>
          <nav className="flex gap-2 text-sm font-medium text-slate-700" aria-label="Candidate">
            <Link href="/jobs" className="rounded-md px-3 py-2 hover:bg-rose-50">
              Browse jobs
            </Link>
            <Link
              href="/candidate/applications"
              className="rounded-md px-3 py-2 hover:bg-rose-50"
            >
              My applications
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My account</h1>
        <p className="mt-1 text-sm text-jobocate-muted">
          Manage your profile, resumes, applications, and saved jobs.
        </p>

        <nav
          className="mt-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white/80 p-1 shadow-sm"
          aria-label="Candidate sections"
        >
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-rose-50 aria-[current=page]:bg-jobocate-coral aria-[current=page]:text-white"
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
