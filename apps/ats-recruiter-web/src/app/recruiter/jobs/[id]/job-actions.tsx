'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JobocateHttpError, createJobocateClient } from '@jobocate/api-sdk';

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; verb: string }
  | { kind: 'error'; message: string };

export function JobActions({
  apiBase,
  tenantId,
  jobId,
  status,
}: {
  apiBase: string;
  tenantId: string;
  jobId: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
}) {
  const router = useRouter();
  const client = useMemo(
    () => createJobocateClient({ baseUrl: apiBase, getTenantId: () => tenantId }),
    [apiBase, tenantId],
  );
  const [s, setS] = useState<Status>({ kind: 'idle' });

  async function run<T>(verb: string, fn: () => Promise<T>) {
    setS({ kind: 'busy', verb });
    try {
      await fn();
      router.refresh();
      setS({ kind: 'idle' });
    } catch (e) {
      setS({
        kind: 'error',
        message: e instanceof JobocateHttpError ? e.body || e.message : (e as Error).message,
      });
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold">Actions</h2>
      {s.kind === 'error' ? (
        <p
          className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {s.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        {status === 'DRAFT' ? (
          <button
            type="button"
            disabled={s.kind === 'busy'}
            onClick={() => run('publish', () => client.jobs.publish(jobId))}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {s.kind === 'busy' && s.verb === 'publish' ? 'Publishing…' : 'Publish'}
          </button>
        ) : null}
        {status === 'PUBLISHED' ? (
          <button
            type="button"
            disabled={s.kind === 'busy'}
            onClick={() => run('unpublish', () => client.jobs.unpublish(jobId))}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
          >
            {s.kind === 'busy' && s.verb === 'unpublish' ? 'Working…' : 'Unpublish'}
          </button>
        ) : null}
        {status !== 'CLOSED' && status !== 'ARCHIVED' ? (
          <button
            type="button"
            disabled={s.kind === 'busy'}
            onClick={() => {
              if (window.confirm('Close this job? Public search will no longer surface it.')) {
                void run('close', () => client.jobs.close(jobId));
              }
            }}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
          >
            {s.kind === 'busy' && s.verb === 'close' ? 'Closing…' : 'Close'}
          </button>
        ) : null}
        <button
          type="button"
          disabled={s.kind === 'busy'}
          onClick={async () => {
            setS({ kind: 'busy', verb: 'clone' });
            try {
              const created = await client.jobs.clone(jobId);
              router.push(`/recruiter/jobs/${created.id}`);
            } catch (e) {
              setS({
                kind: 'error',
                message:
                  e instanceof JobocateHttpError ? e.body || e.message : (e as Error).message,
              });
            }
          }}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
        >
          {s.kind === 'busy' && s.verb === 'clone' ? 'Cloning…' : 'Clone'}
        </button>
      </div>
    </div>
  );
}
