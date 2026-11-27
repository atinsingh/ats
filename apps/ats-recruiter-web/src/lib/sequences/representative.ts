import type { Enrollee, Sequence, Template } from './sequences';

/**
 * Representative sequence, people and templates until messaging and consent records are
 * connected. People are fictional. `day(n)` is the firm-local date n days before today.
 */
export const representativeSequence = (): Sequence => ({
  id: 'java-gta',
  name: 'Contract Java, GTA',
  paused: false,
  steps: [
    {
      day: 1,
      channel: 'email',
      summary: 'First message. Personal, mentions the job and one must-have from their profile',
    },
    { day: 3, channel: 'sms', summary: 'Short nudge that a note about the role is in their inbox' },
    { day: 7, channel: 'email', summary: 'Short follow-up offering two call times' },
  ],
});

export const representativeEnrollees = (day: (daysAgo: number) => string): Enrollee[] => [
  {
    id: 'e1',
    name: 'Wei L.',
    addedOn: day(0),
    consent: ['email'],
    handled: 0,
    firstApproved: false,
  },
  {
    id: 'e2',
    name: 'Amara K.',
    addedOn: day(2),
    consent: ['email', 'sms'],
    handled: 1,
    firstApproved: true,
  },
  {
    id: 'e3',
    name: 'Daniel O.',
    addedOn: day(5),
    consent: ['email'],
    handled: 1,
    firstApproved: true,
  },
  {
    id: 'e4',
    name: 'Sofia R.',
    addedOn: day(4),
    consent: ['email', 'sms'],
    handled: 1,
    firstApproved: true,
    stop: 'replied',
  },
  {
    id: 'e5',
    name: 'Tom B.',
    addedOn: day(8),
    consent: ['email'],
    handled: 3,
    firstApproved: true,
  },
  {
    id: 'e6',
    name: 'Priya N.',
    addedOn: day(6),
    consent: ['email'],
    handled: 1,
    firstApproved: true,
    stop: 'submitted-elsewhere',
  },
  {
    id: 'e7',
    name: 'Jordan P.',
    addedOn: day(3),
    consent: [],
    handled: 1,
    firstApproved: true,
    stop: 'opted-out',
  },
];

export const representativeTemplates = (): Template[] => [
  {
    id: 't1',
    name: 'Contract Java, first touch',
    usedFor: 'Candidates',
    body: 'Hi {first_name}, I am recruiting a {job_title} for {client_or_blind} at {rate_range}. Your {must_have} work stood out. Open to a 10-minute call this week? {recruiter_name}',
    sent30d: 412,
    replyRate: 0.24,
  },
  {
    id: 't2',
    name: 'Brief to a hiring manager',
    usedFor: 'Clients',
    body: 'Hi {first_name}, we have three people available for {job_title} work within two weeks, each verified and checked against your must-haves. Worth 15 minutes? {recruiter_name}',
    sent30d: 58,
    replyRate: 0.17,
  },
  {
    id: 't3',
    name: 'Interview confirmation',
    usedFor: 'Candidates',
    body: 'Hi {first_name}, you are confirmed for {interview_time} with {client_or_blind}. Reply here if anything changes. {recruiter_name}',
    sent30d: 96,
    replyRate: null,
  },
  {
    id: 't4',
    name: 'Assignment ending check-in',
    usedFor: 'Contractors',
    body: 'Hi {first_name}, your assignment ends on {end_date}. Want me to line up what is next? {recruiter_name}',
    sent30d: 22,
    replyRate: 0.68,
  },
];

/** A sample person for previews. No {interview_time} or {end_date}, so those show as missing. */
export const SAMPLE_VARS: Record<string, string> = {
  first_name: 'Wei',
  job_title: 'Senior Java Developer',
  client_or_blind: 'a Toronto health insurer',
  rate_range: '$88 to $96/hr',
  must_have: 'Kafka',
  recruiter_name: 'Maya',
};
