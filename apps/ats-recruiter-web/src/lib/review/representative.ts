import type { Check, Evidence, Proposal } from './queue';

/**
 * Representative proposals for the Review queue until the approvals service exists. Names,
 * clients and figures are fictional. Deadlines are relative to now so the queue never looks stale.
 */

const P = (title: string, detail?: string): Check => ({ status: 'pass', title, detail });
const W = (title: string, detail?: string): Check => ({ status: 'warn', title, detail });
const X = (title: string, detail?: string): Check => ({ status: 'fail', title, detail });
const E = (
  requirement: string,
  status: Evidence['status'],
  mustHave: boolean,
  quote: string | undefined,
  source: string,
): Evidence => ({ requirement, status, mustHave, quote, source });

export function representativeProposals(now: Date = new Date()): Proposal[] {
  const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();
  return [
    {
      id: 'sub-priya',
      kind: 'submittal',
      agent: 'Submittal',
      title: 'Submit Priya N. to Northwind for Senior Java Developer',
      summary:
        '5 of 5 must-haves found. Agreed to representation yesterday at 4:12 PM. 2 of 3 submittal slots left.',
      destination: 'to Northwind through Beeline, as a 2-minute upload task for you',
      dueAt: inHours(1.5),
      dueLabel: 'VMS cut-off in 90 min',
      approveLabel: 'Approve submittal',
      checks: [
        P('Right to represent for Northwind', 'Signed yesterday, 4:12 PM'),
        P('No earlier submission to Northwind', 'Any channel, last 6 months'),
        P('Bill rate inside the rate card', '$96/hr of $98/hr max'),
      ],
      evidence: [
        E(
          'Java 17 and Spring Boot, 5+ years',
          'found',
          true,
          'Led the Spring Boot 3 migration for a payments platform, 2021 to now.',
          'Resume, page 1',
        ),
        E(
          'Kafka in production',
          'found',
          true,
          'Built Kafka consumers processing two million events a day.',
          'Resume, page 1',
        ),
        E(
          'Hybrid, Toronto',
          'found',
          true,
          'I can do three days a week downtown, I live in Mississauga.',
          'Screening call, 08:15',
        ),
        E(
          'AWS certification',
          'missing',
          false,
          undefined,
          'Not in the resume or call notes. Ask before submitting?',
        ),
      ],
    },
    {
      id: 'sub-tom',
      kind: 'submittal',
      agent: 'Submittal',
      title: 'Submit Tom B. to Northwind for Senior Java Developer',
      summary:
        '5 of 5 must-haves found. Your screening call is booked for this afternoon; your policy allows submitting before it.',
      destination: 'to Northwind through Beeline, as a 2-minute upload task for you',
      dueAt: inHours(1.5),
      dueLabel: 'VMS cut-off in 90 min',
      approveLabel: 'Approve submittal',
      checks: [
        P('Right to represent for Northwind', 'Signed 2 days ago'),
        W('Not screened by you yet', 'Call booked this afternoon'),
        P('Bill rate inside the rate card', '$94/hr of $98/hr max'),
      ],
      evidence: [
        E(
          'Java 17 and Spring Boot, 5+ years',
          'found',
          true,
          'Seven years building Spring services for a Canadian insurer.',
          'Resume, page 1',
        ),
        E(
          'Kafka in production',
          'found',
          true,
          'Owned the Kafka event pipeline for claims.',
          'Resume, page 2',
        ),
      ],
    },
    {
      id: 'job-fabrikam',
      kind: 'job-post',
      agent: 'Intake',
      title: 'Publish Cloud Security Analyst for Fabrikam at $70 to $85/hr',
      summary:
        'From a Beeline alert overnight. A $98/hr bill rate gives 15% margin at the top of the range; your floor is 18%.',
      destination: 'to your careers site, Indeed and LinkedIn',
      dueAt: inHours(0.5),
      dueLabel: 'Before posting',
      approveLabel: 'Approve and publish',
      checks: [
        X('Margin below your 18% floor', 'Cap the range at $82/hr for 18%'),
        P('Pay range inside Ontario’s limit', '$15/hr wide'),
        P('No “Canadian experience” wording', 'Checked'),
      ],
      evidence: [
        E(
          'Margin at the top of the range',
          'missing',
          true,
          undefined,
          '15% at $85/hr against an 18% floor',
        ),
      ],
    },
    {
      id: 'msg-marcus',
      kind: 'message',
      agent: 'Outreach',
      title: 'Reply to Marcus T. about remote work for QA Lead',
      summary: 'He asked if the role is remote. The job brief says hybrid, 2 days.',
      draft:
        'Hi Marcus, the client needs two days a week in their Waterloo office, the rest remote. Does that work for you? If so, are you free Thursday or Friday for 20 minutes?',
      destination: 'by email from your mailbox',
      dueAt: inHours(3),
      dueLabel: 'Reply within 3 hours',
      approveLabel: 'Approve and send',
      checks: [
        P('Answer comes from the job brief', 'Hybrid, 2 days in Waterloo'),
        W('No rate mentioned', 'He has not asked yet'),
      ],
      evidence: [
        E(
          'Answer matches the brief',
          'found',
          true,
          'Hybrid, 2 days in the Waterloo office.',
          'Job brief, updated last week',
        ),
      ],
    },
    {
      id: 'msg-ontario',
      kind: 'message',
      agent: 'Screening',
      title: 'Send interview outcome notes to 2 candidates for QA Lead',
      summary:
        'Ontario requires an update within 45 days of an interview. Both interviewed 45 days ago.',
      draft:
        'Hi Jordan, thank you for interviewing for the QA Lead role. The client has chosen another candidate. I would like to keep you in mind for similar roles.',
      destination: 'by email from your mailbox',
      dueAt: inHours(6),
      dueLabel: 'Ontario 45-day deadline today',
      approveLabel: 'Approve and send 2',
      checks: [
        P('Within the 45-day window', 'Due today'),
        P('No reason given that names a protected ground', 'Checked'),
      ],
      evidence: [
        E('Interview date', 'found', true, 'Interview with Adventure Works, 2:00 PM.', 'Calendar'),
      ],
    },
    {
      id: 'ts-week',
      kind: 'timesheet',
      agent: 'Account',
      title: 'Approve 2 contractor timesheets for last week',
      summary: 'Both match the client-approved hours in Fieldglass.',
      destination: 'to your back-office partner for payroll',
      dueAt: inHours(8),
      dueLabel: 'Payroll cut-off 5:00 PM',
      approveLabel: 'Approve timesheets',
      checks: [P('Hours match client approval', '37.5 and 40 hours'), P('No overtime', 'Checked')],
      evidence: [],
    },
    {
      id: 'msg-lena',
      kind: 'message',
      agent: 'Account',
      title: 'Ask Lena M. about her next contract before Woodgrove ends',
      summary: 'Her contract ends in 21 days. Two open roles match her skills.',
      draft:
        'Hi Lena, your Woodgrove contract wraps up soon. I have two Java roles starting next month that fit your background. Want to talk this week?',
      destination: 'by email from your mailbox',
      dueAt: inHours(72),
      dueLabel: 'This week',
      approveLabel: 'Approve and send',
      checks: [P('Consent to contact', 'Current contractor')],
      evidence: [],
    },
  ];
}
