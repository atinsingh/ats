'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JobocateHttpError, createJobocateClient } from '@jobocate/api-sdk';

const ACCEPTED = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_BYTES = 10 * 1024 * 1024;

type Stage = 'idle' | 'reserving' | 'uploading' | 'finalizing' | 'done' | 'error';

export function UploadForm({
  baseUrl,
  tenantId,
  candidateId,
}: {
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
  const [file, setFile] = useState<File | null>(null);
  const [setDefault, setSetDefault] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);

  const ready = file && ACCEPTED.includes(file.type) && file.size > 0 && file.size <= MAX_BYTES;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !ready) return;
    setError(null);
    setStage('reserving');
    try {
      const reserved = await client.resumes.requestUploadUrl({
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      setStage('uploading');
      // Upload directly to S3 using the pre-signed URL. Falls back gracefully
      // when storage isn't actually backing the URL (the in-memory dev mode
      // returns about:blank — finalize still proceeds).
      if (!reserved.uploadUrl.startsWith('about:')) {
        const putRes = await fetch(reserved.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
        if (!putRes.ok) {
          throw new Error(`Upload failed: ${putRes.status}`);
        }
      }

      setStage('finalizing');
      await client.resumes.finalize(reserved.resumeId, { setDefault });
      setStage('done');
      router.push(`/candidate/resumes/${reserved.resumeId}`);
    } catch (e) {
      setStage('error');
      setError(e instanceof JobocateHttpError ? e.body || e.message : (e as Error).message);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor="resume-file">
          Resume file
        </label>
        <input
          id="resume-file"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-jobocate-coral file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
        />
        {file ? (
          <p className="mt-2 text-xs text-slate-500">
            {file.name} · {(file.size / 1024).toFixed(0)} KB · {file.type || 'unknown type'}
          </p>
        ) : null}
        {file && !ACCEPTED.includes(file.type) ? (
          <p className="mt-2 text-xs text-red-700" role="alert">
            Unsupported file type. Choose a PDF, DOC, or DOCX.
          </p>
        ) : null}
        {file && file.size > MAX_BYTES ? (
          <p className="mt-2 text-xs text-red-700" role="alert">
            File is larger than 10 MB.
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={setDefault}
          onChange={(e) => setSetDefault(e.target.checked)}
          className="rounded border-slate-300"
        />
        Make this my default resume
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!ready || stage === 'reserving' || stage === 'uploading' || stage === 'finalizing'}
          className="rounded-md bg-jobocate-coral px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-jobocate-coralHover disabled:opacity-60"
        >
          {stage === 'reserving' && 'Reserving slot…'}
          {stage === 'uploading' && 'Uploading…'}
          {stage === 'finalizing' && 'Finalizing…'}
          {stage === 'done' && 'Uploaded'}
          {(stage === 'idle' || stage === 'error') && 'Upload resume'}
        </button>
        <p className="text-xs text-slate-500">
          Parsing runs in the background — you'll get a chance to review extracted fields next.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
