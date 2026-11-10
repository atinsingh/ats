'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createJobocateClient,
  type AiArtifact,
  type AiArtifactStatus,
} from '@jobocate/api-sdk';

const STATUS_PALETTE: Record<AiArtifactStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  READY_FOR_REVIEW: 'bg-amber-50 text-amber-900',
  APPROVED: 'bg-emerald-50 text-emerald-800',
  REJECTED: 'bg-rose-50 text-rose-800',
  FAILED: 'bg-rose-100 text-rose-900',
  ARCHIVED: 'bg-slate-100 text-slate-600',
};

type Props = {
  artifact: AiArtifact;
  applicationServiceUrl: string;
  tenantId: string;
  candidateUserId: string;
};

export function ArtifactCard({ artifact, applicationServiceUrl, tenantId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<'approve' | 'reject' | 'archive' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReview = artifact.status === 'READY_FOR_REVIEW';
  const canArchive = artifact.status !== 'ARCHIVED';

  async function act(action: 'approve' | 'reject' | 'archive') {
    setBusy(action);
    setError(null);
    try {
      const client = createJobocateClient({
        baseUrl: applicationServiceUrl,
        getTenantId: () => tenantId,
      });
      if (action === 'approve') await client.aiArtifacts.approve(artifact.id);
      if (action === 'reject') await client.aiArtifacts.reject(artifact.id);
      if (action === 'archive') await client.aiArtifacts.archive(artifact.id);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {kindLabel(artifact.kind)}
          </h3>
          <p className="text-xs text-jobocate-muted">
            Requested {formatDate(artifact.createdAt)}
            {artifact.readyAt ? ` · ready ${formatDate(artifact.readyAt)}` : ''}
            {' · '}
            <code className="rounded bg-slate-100 px-1 text-[11px]">
              {artifact.modelVersion}
            </code>
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            STATUS_PALETTE[artifact.status]
          }`}
        >
          {artifact.status.replace('_', ' ').toLowerCase()}
        </span>
      </header>

      {artifact.status === 'FAILED' ? (
        <p className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-900">
          Generation failed: {artifact.failureReason ?? 'unknown error'}
        </p>
      ) : null}

      {artifact.outputText ? (
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-800">
          {artifact.outputText}
        </pre>
      ) : (
        <p className="mt-3 text-xs text-jobocate-muted">
          Awaiting model output…
        </p>
      )}

      {error ? (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <footer className="mt-4 flex flex-wrap justify-end gap-2">
        {canReview ? (
          <>
            <button
              type="button"
              disabled={!!busy || pending}
              onClick={() => act('reject')}
              className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              {busy === 'reject' ? 'Dismissing…' : 'Dismiss'}
            </button>
            <button
              type="button"
              disabled={!!busy || pending}
              onClick={() => act('approve')}
              className="rounded-full bg-jobocate-coral px-4 py-1.5 text-xs font-semibold text-white hover:bg-jobocate-coralHover disabled:opacity-60"
            >
              {busy === 'approve' ? 'Approving…' : 'Approve for use'}
            </button>
          </>
        ) : null}
        {canArchive && !canReview ? (
          <button
            type="button"
            disabled={!!busy || pending}
            onClick={() => act('archive')}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {busy === 'archive' ? 'Archiving…' : 'Archive'}
          </button>
        ) : null}
      </footer>
    </article>
  );
}

function kindLabel(kind: AiArtifact['kind']): string {
  switch (kind) {
    case 'COVER_LETTER':
      return 'Cover letter draft';
    case 'RESUME_VARIANT':
      return 'Resume variant';
    case 'INTERVIEW_QA':
      return 'Interview prep';
    case 'CANDIDATE_SUMMARY':
      return 'Candidate summary';
    case 'MATCH_EXPLANATION':
      return 'Match explanation';
    case 'REJECTION_EMAIL':
      return 'Rejection email';
    case 'SCREENING_QUESTIONS':
      return 'Screening questions';
    case 'SHORTLIST_RECOMMENDATION':
      return 'Shortlist recommendation';
    default:
      return kind;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
