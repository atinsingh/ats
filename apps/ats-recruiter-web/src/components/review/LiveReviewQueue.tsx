'use client';

import { useCallback, useMemo } from 'react';
import { createJobocateClient } from '@jobocate/api-sdk';

import type { Decision, Proposal } from '../../lib/review/queue';
import { ReviewQueue } from './ReviewQueue';

/** The Review queue on real AI drafts: decisions go to application-service after the undo window. */
export function LiveReviewQueue({
  proposals,
  apiBase,
  tenantId,
  userId,
}: {
  proposals: Proposal[];
  apiBase: string;
  tenantId: string;
  userId: string;
}) {
  const client = useMemo(
    () =>
      createJobocateClient({
        baseUrl: apiBase,
        getTenantId: () => tenantId,
        getUserId: () => userId,
      }),
    [apiBase, tenantId, userId],
  );
  const send = useCallback(
    async (p: Proposal, d: Decision) => {
      if (d.outcome === 'rejected') await client.aiArtifacts.reject(p.id);
      else if (d.outcome === 'approved') await client.aiArtifacts.approve(p.id);
      else throw new Error(`${d.outcome} is not supported for AI drafts`);
    },
    [client],
  );
  return <ReviewQueue proposals={proposals} representative={false} send={send} />;
}
