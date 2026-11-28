import type { ClientRecord, ClientStatus as ApiClientStatus } from '@jobocate/api-sdk';

import type { Client, ClientStatus } from './clients';

/** Real clients from job-service, shaped for the Clients list. */

const STATUS: Record<ApiClientStatus, ClientStatus> = {
  ACTIVE: 'active',
  DORMANT: 'dormant',
  PROSPECT: 'prospect',
};

/** "You" for the viewer's own clients, "Teammate" for another desk, "Unassigned" when nobody owns it. */
export function ownerLabel(ownerUserId: string | null | undefined, viewerUserId: string): string {
  if (!ownerUserId) return 'Unassigned';
  return ownerUserId === viewerUserId ? 'You' : 'Teammate';
}

/**
 * Revenue stays unset: placements are not tracked yet, so the list says "Not tracked" rather than
 * showing a made-up $0.
 */
export function toClientRows(rows: readonly ClientRecord[], viewerUserId: string): Client[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: STATUS[r.status] ?? 'prospect',
    openJobs: r.openJobs,
    channel: r.channel || 'Direct',
    owner: ownerLabel(r.ownerUserId, viewerUserId),
    lastContactAt: r.lastContactAt ?? undefined,
    msaEndsAt: r.msaEndsOn ?? undefined,
  }));
}
