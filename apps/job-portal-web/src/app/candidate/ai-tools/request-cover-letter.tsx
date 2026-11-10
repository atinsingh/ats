'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createJobocateClient } from '@jobocate/api-sdk';

type Props = {
  applicationServiceUrl: string;
  tenantId: string;
  candidateUserId: string;
};

export function RequestCoverLetterForm({
  applicationServiceUrl,
  tenantId,
  candidateUserId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [candidateName, setCandidateName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [skills, setSkills] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const client = createJobocateClient({
        baseUrl: applicationServiceUrl,
        getTenantId: () => tenantId,
      });
      await client.aiArtifacts.request({
        kind: 'COVER_LETTER',
        subjectEntityType: 'CANDIDATE_PROFILE',
        subjectEntityId: candidateUserId,
        inputs: {
          candidate_name: candidateName,
          job_title: jobTitle,
          company,
          skills: skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        idempotencyKey: `cover-letter:${candidateUserId}:${jobTitle}:${company}:${Date.now()}`,
      });
      setCandidateName('');
      setJobTitle('');
      setCompany('');
      setSkills('');
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request cover letter');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-slate-900">
        Request a cover letter draft
      </h3>
      <p className="text-xs text-jobocate-muted">
        The draft will be queued for an AI worker. You'll see it appear below in
        a few seconds and can approve or dismiss it.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your name" value={candidateName} onChange={setCandidateName} required />
        <Field label="Job title" value={jobTitle} onChange={setJobTitle} required />
        <Field label="Company" value={company} onChange={setCompany} required />
        <Field
          label="Skills (comma-separated)"
          value={skills}
          onChange={setSkills}
          placeholder="java, spring, postgres"
        />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || pending}
          className="rounded-full bg-jobocate-coral px-5 py-2 text-sm font-semibold text-white hover:bg-jobocate-coralHover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting || pending ? 'Requesting…' : 'Generate draft'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      <span>{label}</span>
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-jobocate-coral focus:outline-none focus:ring-1 focus:ring-jobocate-coral"
      />
    </label>
  );
}
