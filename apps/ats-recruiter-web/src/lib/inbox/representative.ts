import type { Conversation } from './inbox';

/**
 * Representative conversations until the mailbox and SMS integrations exist. People, clients and
 * figures are fictional. Times are relative to now.
 */
export function representativeInbox(now: Date = new Date()): Conversation[] {
  const ago = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
  return [
    {
      id: 'marcus',
      who: 'Marcus T.',
      party: 'candidate',
      channel: 'email',
      subject: 'Re: QA Lead, remote?',
      context: 'Candidate, QA Lead at Contoso',
      unread: true,
      messages: [
        {
          from: 'you',
          at: ago(26),
          body: 'Hi Marcus, I came across your profile and think the QA Lead role at Contoso could be a fit. Open to a chat?',
        },
        {
          from: 'them',
          at: ago(0.8),
          body: "Thanks for reaching out. Is the QA Lead role fully remote? I'm in Hamilton and can't do downtown 5 days. What's the rate range?",
        },
      ],
      link: {
        job: 'QA Lead, Contoso',
        stage: 'Contacted',
        consent: { channel: 'email', at: ago(5 * 24) },
        owner: 'You',
      },
      suggestion: {
        draftedAt: ago(0.78),
        draft:
          "Hi Marcus, it's hybrid: 2 days a week at Contoso's Mississauga office, the rest remote. The rate is $70 to $78/hr on a 12-month contract. Would a 15-minute call today at 2:00 PM or 4:30 PM work?",
        basis: 'Remote policy and rate from the job intake, Nov 18.',
        checks: [
          { status: 'pass', title: 'Answer comes from the job intake', detail: 'Hybrid, 2 days' },
          { status: 'pass', title: 'Rate inside the published range', detail: '$70 to $78/hr' },
        ],
      },
    },
    {
      id: 'dana',
      who: 'Dana W., Northwind',
      party: 'client',
      channel: 'email',
      subject: 'Interview feedback for Tom B.',
      context: 'Hiring manager, Senior Java Developer',
      unread: true,
      messages: [
        {
          from: 'them',
          at: ago(1.3),
          body: 'Tom was strong on Spring and Kafka. We want a second round with our architect on Thursday. Can he do 10 AM?',
        },
      ],
      link: { job: 'Senior Java Developer, Northwind', stage: 'Interview', owner: 'You' },
      suggestion: {
        draftedAt: ago(1.25),
        draft:
          "Thanks Dana, great to hear. I'll confirm Thursday at 10 AM with Tom this morning and send the invite once he's in.",
        basis: 'Your calendar shows Tom free Thursday morning.',
        checks: [
          {
            status: 'warn',
            title: 'Tom has not confirmed yet',
            detail: 'The draft promises to ask him first',
          },
        ],
      },
    },
    {
      id: 'beeline',
      who: 'Beeline alert',
      party: 'system',
      channel: 'vms',
      subject: 'New requisition 48812: Data Engineer',
      context: 'VMS, parsed into a job draft',
      unread: true,
      messages: [
        {
          from: 'them',
          at: ago(3),
          body: 'Requisition 48812, Data Engineer, Fabrikam Insurance. 2 positions, 6 months, Toronto hybrid. Submittal limit 3 per supplier. Closes in 5 days.',
        },
      ],
    },
    {
      id: 'amara',
      who: 'Amara K.',
      party: 'candidate',
      channel: 'sms',
      subject: 'Yes, still looking',
      context: 'Candidate, talent pool',
      unread: false,
      messages: [
        { from: 'you', at: ago(27), body: 'Hi Amara, are you still open to contract roles?' },
        { from: 'them', at: ago(25), body: 'Yes, still looking! Data roles ideally.' },
      ],
      link: { stage: 'Talent pool', consent: { channel: 'sms', at: ago(60 * 24) }, owner: 'You' },
    },
    {
      id: 'hana',
      who: 'Hana S.',
      party: 'candidate',
      channel: 'email',
      subject: 'Can we move Thursday?',
      context: 'Candidate, interview',
      unread: true,
      messages: [
        {
          from: 'them',
          at: ago(22),
          body: 'Something came up on Thursday. Could we move the Northwind interview to Friday afternoon?',
        },
      ],
      link: { job: 'Senior Java Developer, Northwind', stage: 'Interview', owner: 'You' },
    },
    {
      id: 'lena',
      who: 'Lena M.',
      party: 'contractor',
      channel: 'email',
      subject: 'Extension question',
      context: 'Contractor at Woodgrove',
      unread: false,
      messages: [
        {
          from: 'them',
          at: ago(3 * 24),
          body: 'Any news on whether Woodgrove plans to extend? My contract ends in 21 days.',
        },
      ],
      link: { stage: 'Placed', owner: 'You' },
    },
    {
      id: 'jordan-sms',
      who: 'Jordan P.',
      party: 'candidate',
      channel: 'sms',
      subject: 'Suggested first text',
      context: 'Candidate, mobile number from resume',
      unread: false,
      messages: [],
      link: {
        job: 'Data Engineer, Contoso',
        stage: 'Sourced',
        consent: { channel: 'email', at: ago(10 * 24) },
        owner: 'You',
      },
      suggestion: {
        draftedAt: ago(2),
        draft:
          'Hi Jordan, this is Northbeam Staffing. A Data Engineer contract at Contoso matches your background. Open to a quick call?',
        basis: 'Job brief for Data Engineer, Contoso.',
        checks: [],
      },
    },
  ];
}
