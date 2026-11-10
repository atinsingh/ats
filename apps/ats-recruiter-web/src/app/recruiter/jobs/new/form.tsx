'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JobocateHttpError, createJobocateClient } from '@jobocate/api-sdk';

type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string };

export function NewJobForm({ apiBase, tenantId }: { apiBase: string; tenantId: string }) {
  const router = useRouter();
  const client = useMemo(
    () => createJobocateClient({ baseUrl: apiBase, getTenantId: () => tenantId }),
    [apiBase, tenantId],
  );

  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [shouldPublish, setShouldPublish] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setStatus({ kind: 'saving' });
    try {
      const created = await client.jobs.create({
        title: required(data, 'title'),
        department: stringOrUndef(data, 'department'),
        description: stringOrUndef(data, 'description'),
        responsibilities: stringOrUndef(data, 'responsibilities'),
        qualifications: stringOrUndef(data, 'qualifications'),
        employmentType: stringOrUndef(data, 'employmentType'),
        remotePolicy: stringOrUndef(data, 'remotePolicy'),
        location: stringOrUndef(data, 'location'),
        locationCity: stringOrUndef(data, 'locationCity'),
        locationRegion: stringOrUndef(data, 'locationRegion'),
        locationCountry: stringOrUndef(data, 'locationCountry'),
        currencyCode: stringOrUndef(data, 'currencyCode'),
        salaryMinCents: numberOrUndef(data, 'salaryMinCents'),
        salaryMaxCents: numberOrUndef(data, 'salaryMaxCents'),
        experienceMinYears: numberOrUndef(data, 'experienceMinYears'),
        experienceMaxYears: numberOrUndef(data, 'experienceMaxYears'),
        skills: stringListOrUndef(data, 'skills'),
      });

      if (shouldPublish) {
        try {
          await client.jobs.publish(created.id);
        } catch {
          router.push(`/recruiter/jobs/${created.id}?publishError=1`);
          return;
        }
      }
      router.push(`/recruiter/jobs/${created.id}`);
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof JobocateHttpError ? e.body || e.message : (e as Error).message,
      });
    } finally {
      setShouldPublish(false);
    }
  }

  return (
    <form
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={onSubmit}
    >
      <Field label="Title" name="title" required placeholder="Senior Backend Engineer" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Department" name="department" placeholder="Engineering" />
        <Field label="Currency" name="currencyCode" placeholder="USD" maxLength={3} />
      </div>

      <Textarea label="Description" name="description" rows={6} placeholder="What the role does, who it's for..." />
      <Textarea label="Responsibilities" name="responsibilities" rows={4} />
      <Textarea label="Qualifications" name="qualifications" rows={4} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Employment type"
          name="employmentType"
          options={[
            ['', 'Select…'],
            ['FULL_TIME', 'Full time'],
            ['PART_TIME', 'Part time'],
            ['CONTRACT', 'Contract'],
            ['INTERNSHIP', 'Internship'],
            ['TEMPORARY', 'Temporary'],
          ]}
        />
        <Select
          label="Remote policy"
          name="remotePolicy"
          options={[
            ['', 'Select…'],
            ['REMOTE_FIRST', 'Remote first'],
            ['REMOTE', 'Remote'],
            ['HYBRID', 'Hybrid'],
            ['ONSITE', 'Onsite'],
          ]}
        />
        <Field label="Min experience (years)" name="experienceMinYears" inputMode="numeric" />
        <Field label="Max experience (years)" name="experienceMaxYears" inputMode="numeric" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Location (display)" name="location" placeholder="Remote (US)" />
        <Field label="City" name="locationCity" />
        <Field label="Region" name="locationRegion" />
        <Field label="Country" name="locationCountry" placeholder="US" maxLength={2} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Salary min (cents)" name="salaryMinCents" inputMode="numeric" />
        <Field label="Salary max (cents)" name="salaryMaxCents" inputMode="numeric" />
      </div>

      <Field label="Skills (comma separated)" name="skills" placeholder="java,spring,postgres" />

      {status.kind === 'error' ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {status.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status.kind === 'saving'}
          onClick={() => setShouldPublish(false)}
          className="rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {status.kind === 'saving' && !shouldPublish ? 'Saving…' : 'Save draft'}
        </button>
        <button
          type="submit"
          disabled={status.kind === 'saving'}
          onClick={() => setShouldPublish(true)}
          className="rounded-md border border-emerald-300 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
        >
          {status.kind === 'saving' && shouldPublish ? 'Publishing…' : 'Save and publish'}
        </button>
      </div>
    </form>
  );
}

function required(data: FormData, name: string): string {
  const v = (data.get(name) ?? '').toString().trim();
  if (!v) throw new Error(`${name} is required`);
  return v;
}

function stringOrUndef(data: FormData, name: string): string | undefined {
  const v = (data.get(name) ?? '').toString().trim();
  return v || undefined;
}

function numberOrUndef(data: FormData, name: string): number | undefined {
  const raw = (data.get(name) ?? '').toString().trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function stringListOrUndef(data: FormData, name: string): string[] | undefined {
  const v = (data.get(name) ?? '').toString().trim();
  if (!v) return undefined;
  const list = v.split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : undefined;
}

function Field({
  label,
  name,
  required: req,
  placeholder,
  inputMode,
  maxLength,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: 'numeric' | 'text';
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">
        {label}
        {req ? <span className="text-rose-600"> *</span> : null}
      </span>
      <input
        name={name}
        required={req}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  rows,
  placeholder,
}: {
  label: string;
  name: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <textarea
        name={name}
        rows={rows ?? 4}
        placeholder={placeholder}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: [string, string][];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <select
        name={name}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      >
        {options.map(([v, l]) => (
          <option key={`${name}-${v}`} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
