/**
 * Inline alert shown when a backend service URL hasn't been configured.
 * This keeps the portal usable in static demo mode without crashing
 * server components.
 */
export function ConfigMissingNotice({
  envName,
  example,
}: {
  envName: string;
  example?: string;
}) {
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <p className="font-semibold">Backend not connected</p>
      <p className="mt-1">
        Set <code className="rounded bg-white px-1">{envName}</code>
        {example ? (
          <>
            {' '}
            (e.g. <code className="rounded bg-white px-1">{example}</code>)
          </>
        ) : null}{' '}
        and restart this app to load real data.
      </p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900">
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
  cta?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-600">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {hint ? <p className="mt-2 text-sm text-jobocate-muted">{hint}</p> : null}
      {cta ? <div className="mt-4 flex justify-center">{cta}</div> : null}
    </div>
  );
}

export function LoadingCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-3 animate-pulse rounded bg-slate-200/80" style={{ width: `${100 - i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}
