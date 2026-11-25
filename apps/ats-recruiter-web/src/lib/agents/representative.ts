import type { Agent, AgentRun, Capability, Connection, FirmPolicy } from './agents';

/**
 * Representative agents, policy and connections until firm settings and an agent run log exist.
 * Fictional. Run times come from `at(daysAgo, 'HH:MM')`, firm-local, so the page and tests agree.
 */
export const representativePolicy = (): FirmPolicy => ({
  shortlist: 'allowed',
  'interview-reminders': 'allowed',
  'timesheet-reminders': 'allowed',
  'first-outreach': 'approval',
  // A policy that tried to allow this would still be refused by the platform rule.
  'decline-applicants': 'allowed',
});

/** What this recruiter has switched on. */
export const representativeEnabled = (): Capability[] => ['shortlist', 'interview-reminders'];

export const representativeAgents = (): Agent[] => [
  {
    id: 'client-sourcing',
    name: 'Client sourcing agent',
    job: 'Finds hiring signals at target accounts',
    schedule: 'Daily 5:00 AM',
    lastRun: '41 signals, 6 briefs',
    state: 'running',
  },
  {
    id: 'intake',
    name: 'Intake agent',
    job: 'Turns emails, calls and VMS alerts into job drafts',
    schedule: 'On new email',
    lastRun: '3 jobs drafted',
    state: 'running',
  },
  {
    id: 'sourcing',
    name: 'Sourcing agent',
    job: 'Runs saved searches and rediscovers past candidates',
    schedule: 'Nightly 2:00 AM',
    lastRun: '18 new matches',
    capability: 'shortlist',
    state: 'running',
  },
  {
    id: 'outreach',
    name: 'Outreach agent',
    job: 'Drafts first messages and follow-ups',
    schedule: 'On request',
    lastRun: '12 drafts waiting',
    capability: 'first-outreach',
    state: 'running',
  },
  {
    id: 'screening',
    name: 'Screening agent',
    job: 'Summarises screening calls against must-haves',
    schedule: 'After each call',
    lastRun: '2 summaries',
    capability: 'decline-applicants',
    state: 'running',
  },
  {
    id: 'submittal',
    name: 'Submittal agent',
    job: 'Builds blind resumes and submittal packs',
    schedule: 'On request',
    lastRun: '2 packs waiting',
    state: 'running',
  },
  {
    id: 'coordinator',
    name: 'Coordinator agent',
    job: 'Proposes interview times and sends reminders',
    schedule: 'On request',
    lastRun: '3 slots offered',
    capability: 'interview-reminders',
    state: 'running',
  },
  {
    id: 'account',
    name: 'Account agent',
    job: 'Watches assignments ending and timesheet gaps',
    schedule: 'Daily 6:00 AM',
    lastRun: '2 extensions to ask',
    capability: 'timesheet-reminders',
    state: 'paused',
  },
];

export const representativeRuns = (at: (daysAgo: number, time: string) => string): AgentRun[] => [
  {
    id: 'r1',
    agentId: 'sourcing',
    at: at(0, '02:00'),
    input: '6 saved searches, 3 jobs',
    output: '18 matches, 4 rediscovered',
    costCents: 184,
    result: '11 kept, 7 removed by you',
  },
  {
    id: 'r2',
    agentId: 'sourcing',
    at: at(1, '02:00'),
    input: '6 saved searches, 3 jobs',
    output: '9 matches',
    costCents: 112,
    result: '6 kept',
  },
  {
    id: 'r3',
    agentId: 'sourcing',
    at: at(3, '02:00'),
    input: '5 saved searches',
    output: 'Failed: Indeed seat expired',
    costCents: 0,
    result: 'Seat renewed the same day',
    failed: true,
  },
  {
    id: 'r4',
    agentId: 'client-sourcing',
    at: at(1, '05:00'),
    input: '28 target accounts',
    output: '41 signals, 6 briefs',
    costCents: 263,
    result: '4 briefs in your Review queue',
  },
  {
    id: 'r5',
    agentId: 'intake',
    at: at(1, '16:20'),
    input: '1 VMS alert, 2 emails',
    output: '3 job drafts',
    costCents: 41,
    result: '2 approved, 1 edited',
  },
  {
    id: 'r6',
    agentId: 'account',
    at: at(2, '06:00'),
    input: '19 active placements',
    output: '2 extensions to ask',
    costCents: 22,
    result: 'Paused by you after this run',
  },
];

/** `ago(minutes)` gives an ISO time that many minutes before now. */
export const representativeConnections = (ago: (minutes: number) => string): Connection[] => [
  {
    id: 'bullhorn',
    name: 'Bullhorn',
    use: 'Your ATS of record. Insyght reads it nightly and writes placements back',
    status: 'connected',
    since: ago(8 * 60),
  },
  {
    id: 'gmail',
    name: 'Gmail',
    use: 'Sends the messages you approve, from your mailbox',
    status: 'connected',
    since: ago(2),
  },
  {
    id: 'fieldglass',
    name: 'SAP Fieldglass',
    use: 'Timesheets and Contoso requisitions',
    status: 'disconnected',
    since: ago(6 * 60 + 12),
    held: '2 approved timesheets are held until you reconnect. Nothing was sent twice.',
  },
  {
    id: 'beeline',
    name: 'Beeline',
    use: 'Northwind and Fabrikam requisitions. No API, so submittals become upload tasks for you',
    status: 'tasks-only',
    since: ago(3 * 60),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Recruiter',
    use: 'Insyght notes show in Recruiter. You search and send InMails yourself',
    status: 'connected',
    since: ago(3 * 60),
  },
  {
    id: 'indeed',
    name: 'Indeed',
    use: 'Job posts and applicants',
    status: 'connected',
    since: ago(12),
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    use: 'Interview slots and reminders',
    status: 'connected',
    since: ago(2),
  },
  {
    id: 'certn',
    name: 'Certn',
    use: 'Identity checks on every submittal, and background checks you order',
    status: 'connected',
    since: ago(47),
  },
];

export const representativeColleagues = () => [
  { id: 'sam', label: 'Sam W., Java desk' },
  { id: 'ines', label: 'Ines R., Data desk' },
];

export const representativeMailboxes = () => [
  { id: 'me', label: 'Your mailbox (Gmail)' },
  { id: 'desk', label: 'Java desk shared mailbox' },
];

/** The firm's daily sending limit per recruiter. */
export const FIRM_SENDING_MAX = 80;
