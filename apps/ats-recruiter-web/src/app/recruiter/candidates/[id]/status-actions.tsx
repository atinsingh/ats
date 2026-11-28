'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JobocateHttpError, createJobocateClient } from '@jobocate/api-sdk';

import { ALLOWED_NEXT } from '../../../../lib/candidates/transitions';

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
        to: next,
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
      <p className="text-xs text-muted-foreground">
        No further transitions allowed from <code>{current}</code>.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Move to</p>
      <div className="flex flex-wrap gap-2">
        {next.map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            onClick={() => transition(n)}
            className={
              n === 'REJECTED'
                ? 'rounded-md border border-danger/30 bg-danger-soft px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-60'
                : 'rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60'
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
          className="w-full rounded-md border border-input px-3 py-1.5 text-sm shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      ) : null}
      {error ? (
        <p
          className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
