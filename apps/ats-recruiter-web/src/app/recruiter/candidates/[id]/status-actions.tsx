'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JobocateHttpError, createJobocateClient } from '@jobocate/api-sdk';

const ALLOWED_NEXT: Record<string, string[]> = {
  APPLIED: ['SCREENING', 'SHORTLISTED', 'REJECTED'],
  SCREENING: ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW_SCHEDULED', 'REJECTED'],
  INTERVIEW_SCHEDULED: ['INTERVIEWED', 'REJECTED'],
  INTERVIEWED: ['OFFERED', 'REJECTED'],
  OFFERED: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
  EXPIRED: [],
};

export function ApplicationStatusActions({
  apiBase,
  tenantId,
  applicationId,
  current,
}: {
  apiBase: string;
  tenantId: string;
  applicationId: string;
  current: string;
}) {
  const router = useRouter();
  const client = useMemo(
    () => createJobocateClient({ baseUrl: apiBase, getTenantId: () => tenantId }),
    [apiBase, tenantId],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  async function transition(next: string) {
    setBusy(true);
    setError(null);
    try {
      await client.recruiterApplications.transition(applicationId, {
        status: next,
        rejectionReason: next === 'REJECTED' ? reason : undefined,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof JobocateHttpError ? e.body || e.message : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const next = ALLOWED_NEXT[current] ?? [];

  if (next.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No further transitions allowed from <code>{current}</code>.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">Move to</p>
      <div className="flex flex-wrap gap-2">
        {next.map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            onClick={() => transition(n)}
            className={
              n === 'REJECTED'
                ? 'rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60'
                : 'rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60'
            }
          >
            {n.replace('_', ' ').toLowerCase()}
          </button>
        ))}
      </div>
      {next.includes('REJECTED') ? (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional rejection reason"
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
