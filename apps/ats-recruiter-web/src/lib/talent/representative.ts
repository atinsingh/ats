import type { Match, SearchParts } from './talent';

/**
 * Representative jobs, database matches and saved searches until candidate search runs on
 * OpenSearch for this page. People and figures are fictional.
 */
export interface TalentJob {
  id: string;
  label: string;
  parts: SearchParts;
  matches: Match[];
}

export const representativeTalentJobs = (): TalentJob[] => [
  {
    id: 'java-northwind',
    label: 'Senior Java Developer, Northwind Health',
    parts: {
      titles: ['java developer', 'java engineer', 'backend engineer'],
      skills: [['spring boot', 'springboot'], ['kafka']],
      exclude: ['intern', 'student', 'principal architect'],
      locations: ['Mississauga, ON', 'Toronto, ON'],
      radiusKm: 50,
      availableBy: '2026-12-31',
    },
    matches: [
      {
        id: 'm1',
        name: 'Wei L.',
        found: 5,
        of: 5,
        title: 'Senior Java Developer, Scotiabank',
        available: '2026-12-01',
        lastContact: '',
        consent: ['email'],
      },
      {
        id: 'm2',
        name: 'Amara K.',
        found: 5,
        of: 5,
        title: 'Backend Engineer, Shopify',
        available: '2026-12-08',
        lastContact: '2025-03-12',
        consent: ['sms'],
      },
      {
        id: 'm3',
        name: 'Daniel O.',
        found: 4,
        of: 5,
        title: 'Java Engineer, contract ended Oct 30',
        available: '',
        lastContact: '2026-10-30',
        consent: ['email', 'phone'],
      },
      {
        id: 'm4',
        name: 'Sofia R.',
        found: 4,
        of: 5,
        title: 'Platform Engineer, Interac',
        available: '2026-12-15',
        lastContact: '',
        consent: [],
      },
      {
        id: 'm5',
        name: 'Tom B.',
        found: 3,
        of: 5,
        title: 'Java Developer, Rogers',
        available: '2027-01-05',
        lastContact: '2026-06-02',
        consent: ['email'],
      },
    ],
  },
  {
    id: 'qa-contoso',
    label: 'QA Lead, Contoso Retail',
    parts: {
      titles: ['qa lead', 'sdet', 'test automation engineer'],
      skills: [
        ['selenium', 'playwright', 'cypress'],
        ['java', 'typescript'],
      ],
      exclude: ['manual only'],
      locations: ['Toronto, ON'],
      radiusKm: 40,
    },
    matches: [
      {
        id: 'q1',
        name: 'Hana S.',
        found: 4,
        of: 4,
        title: 'SDET, Loblaw Digital',
        available: '',
        lastContact: '2026-09-14',
        consent: ['email'],
      },
      {
        id: 'q2',
        name: 'Marcus T.',
        found: 3,
        of: 4,
        title: 'QA Engineer, Wealthsimple',
        available: '2026-12-20',
        lastContact: '',
        consent: ['email', 'sms'],
      },
    ],
  },
];

export const representativeSavedSearches = () => [
  {
    id: 's1',
    name: 'Java and Kafka, GTA',
    schedule: 'Nightly 2:00 AM',
    latest: '18 new last night',
    on: true,
  },
  {
    id: 's2',
    name: 'Azure data engineers, Ontario',
    schedule: 'Nightly 2:00 AM',
    latest: '4 new',
    on: true,
  },
  {
    id: 's3',
    name: 'QA leads, remote Canada',
    schedule: 'Paused Nov 10',
    latest: 'No runs since',
    on: false,
  },
];
