import type { PlacementExtension, PlacementRecord } from '@jobocate/api-sdk';

import type { SubmittalNames } from '../submittals/live';
import type { Extension, Placement } from './placements';

/** Real placements from application-service, shaped for the Placements list. */

const EXTENSION: Record<PlacementExtension, Extension> = {
  NONE: 'none',
  ASKED: 'asked',
  AGREED: 'agreed',
  DECLINED: 'declined',
};

/** Names come from the same lookups as submittals: candidate, job and client by id. */
export function toPlacementRows(
  rows: readonly PlacementRecord[],
  names: SubmittalNames,
): Placement[] {
  return rows.map((r) => ({
    id: r.id,
    contractor: names.candidates.get(r.candidateProfileId) ?? 'Candidate not found',
    client: r.clientId ? (names.clients.get(r.clientId) ?? 'Client not found') : 'No client set',
    role: names.jobs.get(r.jobId) ?? 'Job not found',
    start: r.startDate,
    end: r.endDate,
    bill: Number(r.billRate),
    pay: Number(r.payRate),
    extension: EXTENSION[r.extension] ?? 'none',
  }));
}
