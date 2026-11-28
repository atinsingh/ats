import type { SourcingTarget } from './sourcing';

/**
 * Representative sourcing targets until the sourcing agent and a job-posting feed are connected.
 * Companies and figures are fictional; contacts are roles, never named people.
 */
export const representativeTargets = (): SourcingTarget[] => [
  {
    id: 'fabrikam',
    company: 'Fabrikam Insurance',
    meta: 'Toronto · 2,400 staff',
    signal: '7 Java and data roles posted in 14 days',
    signalSource: 'Company careers page and Indeed, last 14 days',
    benchReady: 14,
    contactRole: 'Director, Data Platform',
    owner: 'Ben C.',
    draft:
      'Hi [NAME], Fabrikam has posted seven data and Java roles in the last two weeks. We place contract engineers in Toronto financial services, and three people on our bench have built Kafka pipelines for insurers. Could I send two anonymised profiles this week?',
    profiles: ['Senior data engineer, 9 yrs', 'Java lead, 11 yrs'],
  },
  {
    id: 'tailspin',
    company: 'Tailspin Logistics',
    meta: 'Mississauga · 900 staff',
    signal: 'New VP Engineering and 4 cloud roles',
    signalSource: 'Press release and LinkedIn job posts, last 30 days',
    benchReady: 6,
    contactRole: 'VP Engineering',
    owner: 'You',
    draft:
      'Hi [NAME], congratulations on the new role. Teams in their first 90 days often need contract cloud engineers while permanent hires close. We have six AWS engineers available in the GTA. Would a short call next week help?',
    profiles: ['AWS platform engineer, 7 yrs', 'Cloud security analyst, 5 yrs'],
  },
  {
    id: 'woodgrove',
    company: 'Woodgrove Bank',
    meta: 'Toronto · 12,000 staff',
    signal: 'Supplier list open on Fieldglass, 22 open requisitions',
    signalSource: 'Fieldglass supplier notice',
    benchReady: 9,
    contactRole: 'MSP program manager',
    owner: 'Unassigned',
    draft:
      'Hello, we would like to be considered for Woodgrove’s Fieldglass supplier program for Java and data roles. What does onboarding as a supplier involve?',
    profiles: [],
  },
  {
    id: 'adventure',
    company: 'Adventure Works',
    meta: 'Oakville · 600 staff',
    signal: 'QA Lead reposted 3 times',
    signalSource: 'Indeed, three postings since September',
    benchReady: 3,
    contactRole: 'Head of Quality',
    owner: 'You',
    draft:
      'Hi [NAME], the QA Lead role has been open for a while. We have a QA lead with 10 years in retail e-commerce who is available now. Happy to share a blind profile.',
    profiles: ['QA lead, 10 yrs'],
  },
];
