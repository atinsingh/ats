import Image from 'next/image';
import Link from 'next/link';
import type { SVGProps } from 'react';

function ChevronDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-4 w-4 opacity-70" {...props}>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5" {...props}>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

function ArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="h-4 w-4" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0l-6-6m6 6l-6 6" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="bg-landing-gradient text-jobocate-ink min-h-dvh">
      <header className="border-b border-rose-100/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-jobocate-coral sm:text-xl">
            JOBOCATE
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-medium text-slate-700 md:flex" aria-label="Main">
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-0.5 rounded-lg px-3 py-2 hover:bg-rose-50 [&::-webkit-details-marker]:hidden">
                Products
                <ChevronDown />
              </summary>
              <div className="absolute left-0 top-full z-10 mt-1 min-w-[11rem] rounded-xl border border-slate-200/80 bg-white py-1 shadow-lg">
                <Link className="block px-4 py-2 text-sm hover:bg-rose-50" href="/jobs">
                  Job search
                </Link>
                <a className="block px-4 py-2 text-sm hover:bg-rose-50" href="#">
                  Applications
                </a>
              </div>
            </details>
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-0.5 rounded-lg px-3 py-2 hover:bg-rose-50 [&::-webkit-details-marker]:hidden">
                Resources
                <ChevronDown />
              </summary>
              <div className="absolute left-0 top-full z-10 mt-1 min-w-[11rem] rounded-xl border border-slate-200/80 bg-white py-1 shadow-lg">
                <a className="block px-4 py-2 text-sm hover:bg-rose-50" href="#">
                  Blog
                </a>
                <a className="block px-4 py-2 text-sm hover:bg-rose-50" href="#">
                  Help center
                </a>
              </div>
            </details>
            <a className="rounded-lg px-3 py-2 hover:bg-rose-50" href="#">
              Pricing
            </a>
            <a className="rounded-lg px-3 py-2 hover:bg-rose-50" href="#">
              About
            </a>
            <a className="rounded-lg px-3 py-2 hover:bg-rose-50" href="#">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/jobs"
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Browse jobs
            </Link>
            <a
              href="#dashboard-preview"
              className="rounded-full bg-jobocate-coral px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-jobocate-coralHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jobocate-coral"
            >
              Dashboard
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 pb-10 pt-10 text-center sm:px-6 sm:pt-14">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-200/80 bg-white/90 px-4 py-1.5 text-xs font-medium text-rose-700 shadow-sm sm:text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-jobocate-coral" aria-hidden />
            Join 100,000+ job seekers using AI
          </p>
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl sm:leading-[1.1]">
            Revolutionizing the{' '}
            <span className="bg-gradient-to-r from-orange-500 via-jobocate-coral to-rose-600 bg-clip-text text-transparent">
              Job Search
            </span>{' '}
            with AI
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-jobocate-muted sm:text-lg">
            Stop applying for weeks. Start interviewing in days. Our AI finds matching jobs, tailors your applications
            with human review for quality, and helps you land interviews faster.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="#"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-jobocate-coral px-8 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-jobocate-coralHover sm:w-auto"
            >
              Get Started — It&apos;s Free
              <ArrowRight />
            </a>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:w-auto"
            >
              <PlayIcon className="text-jobocate-coral" />
              Watch Demo
            </button>
          </div>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <div className="flex -space-x-2" aria-hidden>
              {['from-violet-400 to-fuchsia-500', 'from-sky-400 to-cyan-400', 'from-amber-400 to-orange-500', 'from-emerald-400 to-teal-500'].map(
                (gradient, i) => (
                  <span
                    key={i}
                    className={`inline-block h-10 w-10 rounded-full border-2 border-white bg-gradient-to-br ${gradient} ring-1 ring-slate-100`}
                  />
                ),
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="text-amber-400" aria-label="5 out of 5 stars">
                ★★★★★
              </span>
              <span>Loved by 100,000+ users</span>
            </div>
          </div>
        </section>

        <section id="dashboard-preview" className="mx-auto max-w-5xl px-4 pb-16 pt-4 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.25)]">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <div className="flex gap-1.5" aria-hidden>
                <span className="h-3 w-3 rounded-full bg-red-300/90" />
                <span className="h-3 w-3 rounded-full bg-amber-300/90" />
                <span className="h-3 w-3 rounded-full bg-emerald-300/90" />
              </div>
              <p className="ml-2 truncate rounded-md bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200/80 sm:text-sm">
                app.jobocate.com/dashboard
              </p>
            </div>
            <div className="relative aspect-[16/10] w-full bg-slate-50/50">
              <Image
                src="/landing-dashboard-preview.png"
                alt="Screenshot of the Jobocate dashboard: applications sent, interviews, match score, and saved jobs"
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 1024px"
                priority
              />
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-jobocate-muted">
            Product UI preview — metrics and layout as candidates see them in the app.
          </p>
        </section>
      </main>

      <footer className="border-t border-rose-100/80 bg-white/60 py-8 text-center text-sm text-slate-500 backdrop-blur-sm">
        <p>© {new Date().getFullYear()} Jobocate. Tenant-isolated search; ATS workflows in PostgreSQL.</p>
      </footer>
    </div>
  );
}
