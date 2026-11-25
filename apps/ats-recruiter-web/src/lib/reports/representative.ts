import type { AgentResult, FunnelCount, SourceResult } from './reports';

/**
 * Representative desk figures for the last 90 days until a reporting API exists. Figures are
 * fictional but consistent: sources add up to the funnel's submittals and starts.
 */
export const representativeFunnel = (): FunnelCount[] => [
  { stage: 'Sourced or applied', count: 1204 },
  { stage: 'Contacted', count: 412 },
  { stage: 'Screened', count: 140 },
  { stage: 'Submitted', count: 96 },
  { stage: 'Client interview', count: 41 },
  { stage: 'Offer', count: 25 },
  { stage: 'Started', count: 23 },
];

export const representativeSources = (): SourceResult[] => [
  { source: 'Insyght database, rediscovered', submitted: 28, started: 9, spend: 0 },
  { source: 'Referral', submitted: 12, started: 4, spend: 2000, spendNote: 'bonuses' },
  { source: 'Indeed, sponsored', submitted: 22, started: 3, spend: 4200 },
  { source: 'LinkedIn Recruiter', submitted: 24, started: 5, spend: 2700, spendNote: 'seat share' },
  { source: 'Careers page', submitted: 10, started: 2, spend: 0 },
];

export const representativeAgents = (): AgentResult[] => [
  {
    agent: 'Outreach',
    proposals: 612,
    approved: 425,
    edited: 132,
    rejected: 43,
    minutesSaved: 2460,
  },
  { agent: 'Submittal', proposals: 48, approved: 27, edited: 18, rejected: 2, minutesSaved: 1140 },
  { agent: 'Intake', proposals: 37, approved: 31, edited: 6, rejected: 0, minutesSaved: 540 },
  {
    agent: 'Client sourcing',
    proposals: 26,
    approved: 12,
    edited: 8,
    rejected: 6,
    minutesSaved: 720,
  },
];
