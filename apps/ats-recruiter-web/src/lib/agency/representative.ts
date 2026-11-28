import type { Desk, ManagerItem, PolicyRow } from './agency';

/** Representative desks until desk metrics are connected (IATS-176 is screens first). */
export function representativeDesks(): Desk[] {
  return [
    {
      id: 'd-aisha',
      name: 'Aisha K.',
      focus: 'Java and data, banking',
      roles: 38,
      submittals: 14,
      interviews: 6,
      starts: 2,
      queue: 4,
      newClients: 1,
    },
    {
      id: 'd-ben',
      name: 'Ben C.',
      focus: 'Cloud and security',
      roles: 27,
      submittals: 11,
      interviews: 5,
      starts: 1,
      queue: 12,
      newClients: 0,
    },
    {
      id: 'd-carmen',
      name: 'Carmen D.',
      focus: 'QA and delivery',
      roles: 22,
      submittals: 9,
      interviews: 3,
      starts: 1,
      queue: 2,
      newClients: 2,
    },
    {
      id: 'd-dev',
      name: 'Dev P.',
      focus: 'Healthcare IT',
      roles: 31,
      submittals: 6,
      interviews: 1,
      starts: 0,
      queue: 26,
      newClients: 0,
    },
    {
      id: 'd-erin',
      name: 'Erin L.',
      focus: 'Industrial and light industrial',
      roles: 45,
      submittals: 19,
      interviews: 8,
      starts: 4,
      queue: 7,
      newClients: 1,
    },
  ];
}

export function representativePolicy(): PolicyRow[] {
  return [
    { what: 'Follow-ups and scheduling', decider: 'agent' },
    { what: 'First contact with a candidate', decider: 'recruiter' },
    { what: 'Submittals and declines', decider: 'recruiter' },
    { what: 'Rates below the margin floor', decider: 'manager' },
    { what: 'New client outreach', decider: 'recruiter', note: 'Territory checked first' },
  ];
}

/** `day(n)` returns the firm's date n days from today. */
export function representativeManagerItems(day: (n: number) => string): ManagerItem[] {
  return [
    {
      id: 'm-territory',
      kind: 'territory',
      title: 'Two desks claim Tailspin Logistics',
      detail: 'Ben C. and Erin L. both drafted intros. Pick an owner before either is sent.',
      href: '/recruiter/sourcing',
      blocking: true,
    },
    {
      id: 'm-duplicate',
      kind: 'duplicate',
      title: 'Duplicate submission blocked',
      detail:
        'Woodgrove: the second desk’s submittal of the same candidate was stopped before it went out.',
      href: '/recruiter/submittals',
      blocking: true,
    },
    {
      id: 'm-credential',
      kind: 'credential',
      title: 'Beeline password expires soon',
      detail: 'Renew it in Settings to keep submittals flowing.',
      href: '/recruiter/settings',
      dueOn: day(5),
      blocking: false,
    },
    {
      id: 'm-compliance',
      kind: 'compliance',
      title: 'Bias audit export',
      detail: 'Needed for clients hiring in New York City.',
      href: '/recruiter/reports',
      dueOn: day(34),
      blocking: false,
    },
  ];
}
