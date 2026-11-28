import type { Check, Proposal } from '../review/queue';

/**
 * Client sourcing logic. The sourcing agent finds companies hiring for skills the bench already
 * has and drafts an intro; a person approves, edits or skips every draft. Targets become Review
 * queue proposals, so the same decision rules apply. Pure and unit-tested
 * (test/sourcing.test.ts).
 */

export interface SourcingTarget {
  id: string;
  company: string;
  /** e.g. "Toronto · 2,400 staff". */
  meta: string;
  /** The public hiring signal the agent found, e.g. "7 Java and data roles posted in 14 days". */
  signal: string;
  /** Where the signal came from, e.g. "Company careers page and Indeed, last 14 days". */
  signalSource: string;
  /** Bench people who match and are available now. */
  benchReady: number;
  /** A role, not a person: the agent does not guess names. */
  contactRole: string;
  /** Desk that owns the company under territory rules: "You", "Unassigned", or another desk. */
  owner: string;
  draft: string;
  /** Anonymised one-line profiles the draft offers to share. */
  profiles: string[];
}

/** Placeholders the agent leaves for a person to fill, such as [NAME]. */
export function unfilledPlaceholders(text: string): string[] {
  return [...new Set(text.match(/\[[A-Z][A-Z _-]*\]/g) ?? [])];
}

export const ownsTerritory = (t: SourcingTarget) => t.owner === 'You' || t.owner === 'Unassigned';

export function territoryCheck(t: SourcingTarget): Check {
  if (t.owner === 'You') return { status: 'pass', title: 'Territory is yours' };
  if (t.owner === 'Unassigned')
    return { status: 'pass', title: 'Unassigned in your territory', detail: 'Yours once you send' };
  return {
    status: 'fail',
    title: `Owned by ${t.owner}'s desk`,
    detail: 'Ask them to hand it over before pitching',
  };
}

export function targetChecks(t: SourcingTarget): Check[] {
  const blanks = unfilledPlaceholders(t.draft);
  return [
    territoryCheck(t),
    {
      status: 'warn',
      title: 'Verify the contact before sending',
      detail: `Likely ${t.contactRole}; no named person was guessed`,
    },
    ...(t.profiles.length
      ? [
          {
            status: 'pass' as const,
            title: 'Featured candidates are anonymised',
            detail: `${t.profiles.length} blind ${t.profiles.length === 1 ? 'profile' : 'profiles'}`,
          },
        ]
      : []),
    ...(blanks.length
      ? [{ status: 'warn' as const, title: `Fill in ${blanks.join(', ')} before approving` }]
      : []),
  ];
}

/** Open targets first: yours or unassigned, then by bench match, then by name. */
export function rankTargets(targets: readonly SourcingTarget[]): SourcingTarget[] {
  return [...targets].sort(
    (a, b) =>
      Number(ownsTerritory(b)) - Number(ownsTerritory(a)) ||
      b.benchReady - a.benchReady ||
      a.company.localeCompare(b.company),
  );
}

export function toProposal(t: SourcingTarget, now: Date): Proposal {
  return {
    id: `src-${t.id}`,
    kind: 'message',
    agent: 'Client sourcing',
    title: `Send an intro to ${t.company}`,
    summary: `${t.signal}. ${t.benchReady} people on your bench match. Likely hiring manager: ${t.contactRole}.`,
    draft: t.draft,
    destination: `by email from your mailbox to the ${t.contactRole}`,
    dueAt: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
    dueLabel: 'This week',
    approveLabel: 'Approve and send',
    checks: targetChecks(t),
    evidence: [
      {
        requirement: 'Hiring signal',
        status: 'found',
        mustHave: true,
        quote: t.signal,
        source: t.signalSource,
      },
    ],
  };
}
