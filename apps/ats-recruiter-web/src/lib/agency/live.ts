import type { DeskMetrics, DeskRoles } from '@jobocate/api-sdk';

import type { SubmittalNames } from '../submittals/live';
import type { Desk, ManagerItem } from './agency';

/** Real desk counts for the Agency view, joined from application-service and job-service. */

export const LIVE_AGENCY_NOTE =
  'Live desk counts for the last 7 days; open roles and the Review queue are as of now. Desk focus, territories, credentials and compliance are not tracked yet, so only duplicate submittals show under Needs a manager.';

export const SAMPLE_POLICY_NOTE =
  'Sample policy. Firm AI settings are not stored yet, so this shows the intended defaults.';

function personName(
  userId: string,
  viewerUserId: string,
  colleagues: ReadonlyMap<string, string>,
): string {
  return colleagues.get(userId) ?? (userId === viewerUserId ? 'You' : 'Teammate');
}

/** One row per person with any work in either service. Focus is not tracked, so it stays empty. */
export function toDesks(
  metrics: DeskMetrics,
  roles: DeskRoles,
  viewerUserId: string,
  colleagues: ReadonlyMap<string, string>,
): Desk[] {
  const byId = new Map<string, Desk>();
  const desk = (id: string) => {
    let d = byId.get(id);
    if (!d) {
      d = {
        id,
        name: personName(id, viewerUserId, colleagues),
        focus: '',
        roles: 0,
        submittals: 0,
        interviews: 0,
        starts: 0,
        queue: 0,
        newClients: 0,
      };
      byId.set(id, d);
    }
    return d;
  };
  for (const m of metrics.desks) {
    const d = desk(m.userId);
    d.submittals = m.submittals;
    d.interviews = m.interviews;
    d.starts = m.starts;
    d.queue = m.queue;
  }
  for (const r of roles.desks) {
    const d = desk(r.userId);
    d.roles = r.roles;
    d.newClients = r.newClients;
  }
  return [...byId.values()];
}

/** "A, B and C". */
function listOf(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Open submittals of one candidate to one client from more than one desk. A manager decides. */
export function duplicateItems(
  duplicates: DeskMetrics['duplicates'],
  names: SubmittalNames,
  viewerUserId: string,
  colleagues: ReadonlyMap<string, string>,
): ManagerItem[] {
  return duplicates.map((d) => {
    const candidate = names.candidates.get(d.candidateProfileId) ?? 'A candidate';
    const client = names.clients.get(d.clientId) ?? 'A client';
    const desks = listOf(d.ownerUserIds.map((id) => personName(id, viewerUserId, colleagues)));
    return {
      id: `dup-${d.candidateProfileId}-${d.clientId}`,
      kind: 'duplicate',
      title: 'Same candidate from more than one desk',
      detail: `${client}: ${candidate} has open submittals from ${desks}. Decide which desk owns it.`,
      href: '/recruiter/submittals',
      blocking: true,
    };
  });
}
