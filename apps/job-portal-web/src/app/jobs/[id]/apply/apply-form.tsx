'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import {
  JobocateHttpError,
  createJobocateClient,
  type Resume,
} from '@jobocate/api-sdk';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading-resumes' }
  | { kind: 'submitting' }
  | { kind: 'success'; applicationId: string }
  | { kind: 'error'; message: string };

export function ApplyForm({
  jobId,
  apiBase,
  resumesApiBase,
  tenantId,
  candidateId,
}: {
  jobId: string;
  apiBase: string;
  /** Candidate-service URL — `/api/v1/me/resumes` lives there, separate from application-service. */
  resumesApiBase: string;
  tenantId: string;
  candidateId?: string;
}) {
  const idemKey = useMemo(() => `apply-${jobId}-${cryptoSafeRandom()}`, [jobId]);
  const fieldId = useId();

  const client = useMemo(
    () =>
      createJobocateClient({
        baseUrl: apiBase,
        getTenantId: () => tenantId,
        getCandidateId: candidateId ? () => candidateId : undefined,
      }),
    [apiBase, tenantId, candidateId],
  );

  const resumesClient = useMemo(
    () =>
      createJobocateClient({
        baseUrl: resumesApiBase,
        getTenantId: () => tenantId,
        getCandidateId: candidateId ? () => candidateId : undefined,
      }),
    [resumesApiBase, tenantId, candidateId],
  );

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'loading-resumes' });

  useEffect(() => {
    let cancelled = false;
    setStatus({ kind: 'loading-resumes' });
    resumesClient.resumes
      .mine()
      .then((rows) => {
        if (cancelled) return;
        setResumes(rows);
        const primary = rows.find((r) => r.isPrimary) ?? rows[0];
        if (primary) setResumeId(primary.id);
        setStatus({ kind: 'idle' });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof JobocateHttpError && e.status === 404) {
          setResumes([]);
          setStatus({ kind: 'idle' });
        } else {
          setStatus({ kind: 'error', message: errorMessage(e) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [resumesClient]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: 'submitting' });
    try {
      const result = await client.applications.submit({
        jobId,
        resumeId: resumeId || undefined,
        coverLetterText: coverLetter || undefined,
        idempotencyKey: idemKey,
      });
      setStatus({ kind: 'success', applicationId: result.id });
    } catch (e: unknown) {
      if (e instanceof JobocateHttpError && e.status === 409) {
        setStatus({
          kind: 'error',
          message: 'You already have an active application for this role.',
        });
      } else {
        setStatus({ kind: 'error', message: errorMessage(e) });
      }
    }
  }

  if (status.kind === 'success') {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <p className="text-base font-semibold">Application submitted</p>
        <p className="mt-1 text-sm">
          Tracking id: <code className="rounded bg-white px-1">{status.applicationId}</code>
        </p>
        <a
          href="/candidate/applications"
          className="mt-4 inline-block rounded-full bg-jobocate-coral px-5 py-2 text-sm font-semibold text-white hover:bg-jobocate-coralHover"
        >
          See my applications
        </a>
      </div>
    );
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${fieldId}-resume`} className="text-sm font-medium text-slate-700">
          Resume
        </label>
        {status.kind === 'loading-resumes' ? (
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
            Loading your resumes…
          </p>
        ) : resumes.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            You don&apos;t have a resume on file. <a href="/candidate/resumes" className="underline">Upload one</a> to apply.
          </p>
        ) : (
          <select
            id={`${fieldId}-resume`}
            value={resumeId}
            onChange={(e) => setResumeId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-jobocate-coral focus:ring-2"
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fileName}{r.isPrimary ? ' (primary)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${fieldId}-cover`} className="text-sm font-medium text-slate-700">
          Cover letter (optional)
        </label>
        <textarea
          id={`${fieldId}-cover`}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          rows={6}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-jobocate-coral focus:ring-2"
          placeholder="Tell the team why you're a great fit…"
        />
      </div>

      {status.kind === 'error' ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {status.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status.kind === 'submitting' || resumes.length === 0}
        className="rounded-full bg-jobocate-coral px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-jobocate-coralHover disabled:opacity-60"
      >
        {status.kind === 'submitting' ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  );
}

function cryptoSafeRandom() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function errorMessage(e: unknown): string {
  if (e instanceof JobocateHttpError) {
    return e.body || e.message;
  }
  if (e instanceof Error) return e.message;
  return 'Something went wrong';
}
