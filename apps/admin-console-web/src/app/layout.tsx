import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Insyght AI Admin',
    template: '%s | Insyght AI',
  },
  description: 'Operational and developer console for the Insyght AI hiring platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col px-4 py-6 sm:max-w-screen-md lg:max-w-screen-xl">
          <header className="mb-6 border-b border-slate-200 pb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                  Insyght AI
                </div>
                <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">
                  Platform Console
                </h1>
              </div>
              <nav
                aria-label="Platform console"
                className="flex items-center gap-1 text-sm font-medium"
              >
                <Link
                  href="/"
                  className="rounded-md px-3 py-2 text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                >
                  Operations
                </Link>
                <Link
                  href="/developer"
                  className="rounded-md px-3 py-2 text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                >
                  Developer Hub
                </Link>
              </nav>
            </div>
          </header>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
