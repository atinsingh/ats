'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JobocateHttpError, createJobocateClient } from '@jobocate/api-sdk';

export function ParsedFieldsActions({
  resumeId,
  baseUrl,
  tenantId,
  candidateId,
}: {
  resumeId: string;
  baseUrl: string;
  tenantId: string;
  candidateId: string;
}) {
  const router = useRouter();
  const client = useMemo(
    () =>
      createJobocateClient({
        baseUrl,
        getTenantId: () => tenantId,
        getCandidateId: () => candidateId,
      }),
    [baseUrl, tenantId, candidateId],
  );
  const [busy, setBusy] = useState<'apply' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    setBusy('apply');
    setError(null);
    try {
      await client.resumes.applyParsedFields(resumeId);
      router.refresh();
    } catch (e) {
      setError(e instanceof JobocateHttpError ? e.body || e.message : (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setBusy('reject');
    setError(null);
    try {
      await client.resumes.rejectParsedFields(resumeId);
      router.refresh();
    } catch (e) {
      setError(e instanceof JobocateHttpError ? e.body || e.message : (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy != null}
          onClick={apply}
          className="rounded-md bg-jobocate-coral px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-jobocate-coralHover disabled:opacity-60"
        >
          {busy === 'apply' ? 'Applying…' : 'Apply to profile'}
        </button>
        <button
          type="button"
          disabled={busy != null}
          onClick={reject}
          className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {busy === 'reject' ? 'Dismissing…' : 'Dismiss'}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
