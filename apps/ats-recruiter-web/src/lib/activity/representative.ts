import type { ActivityEvent } from './activity';

/**
 * Representative activity until the audit service is connected (IATS-175 is screens first).
 * `at(daysAgo, 'HH:MM')` returns an ISO time in the firm's zone, so the page controls the clock.
 */
export function representativeActivity(
  at: (daysAgo: number, time: string) => string,
): ActivityEvent[] {
  const fixed: ActivityEvent[] = [
    {
      id: 'ev-1',
      at: at(0, '09:52'),
      actorKind: 'person',
      actor: 'Priya Shah',
      type: 'data-access',
      action: 'Ordered a background check',
      subject: 'Jordan E., through Certn',
    },
    {
      id: 'ev-2',
      at: at(0, '09:13'),
      actorKind: 'agent',
      actor: 'Outreach agent',
      type: 'draft',
      action: 'Drafted a reply',
      subject: 'Marcus T.',
      approvedBy: null,
    },
    {
      id: 'ev-3',
      at: at(0, '08:41'),
      actorKind: 'person',
      actor: 'Priya Shah',
      type: 'send',
      action: 'Approved and sent a message',
      subject: 'Daniel O.',
    },
    {
      id: 'ev-4',
      at: at(0, '07:02'),
      actorKind: 'agent',
      actor: 'Intake agent',
      type: 'draft',
      action: 'Created a job draft from Beeline alert 48812',
      subject: 'Data Engineer, Northwind',
      approvedBy: null,
    },
    {
      id: 'ev-5',
      at: at(0, '03:12'),
      actorKind: 'system',
      actor: 'System',
      type: 'connection',
      action: 'Connection failed; new requisitions are held',
      subject: 'SAP Fieldglass',
      failed: true,
    },
    {
      id: 'ev-6',
      at: at(1, '16:12'),
      actorKind: 'person',
      actor: 'Priya Shah',
      type: 'override',
      action: 'Overrode a failed margin check on a submittal',
      subject: 'Wei L. for Senior Java Developer, Northwind',
      reason: 'Client agreed $102/hr on the call',
    },
    {
      id: 'ev-7',
      at: at(1, '14:30'),
      actorKind: 'person',
      actor: 'Ben C.',
      type: 'settings',
      action: 'Changed agent autonomy to draft only',
      subject: 'Coordinator agent',
    },
    {
      id: 'ev-8',
      at: at(1, '11:05'),
      actorKind: 'agent',
      actor: 'Coordinator agent',
      type: 'send',
      action: 'Sent an interview reminder',
      subject: 'Aisha K.',
      approvedBy: 'Priya Shah',
    },
    {
      id: 'ev-9',
      at: at(1, '09:40'),
      actorKind: 'person',
      actor: 'Priya Shah',
      type: 'approval',
      action: 'Approved a submittal',
      subject: 'Lena M. for QA Analyst, Contoso',
    },
    {
      id: 'ev-10',
      at: at(1, '02:00'),
      actorKind: 'agent',
      actor: 'Sourcing agent',
      type: 'draft',
      action: 'Shortlisted 9 matches',
      subject: 'Senior Java Developer, Northwind',
      approvedBy: 'Priya Shah',
    },
  ];

  // Older routine activity so the log has more than one page.
  const names = ['Aisha K.', 'Daniel O.', 'Lena M.', 'Marcus T.', 'Omar R.', 'Sofia P.'];
  const older: ActivityEvent[] = Array.from({ length: 24 }, (_, i) => {
    const kind = i % 3;
    const daysAgo = 2 + Math.floor(i / 4);
    const time = `${String(9 + (i % 4) * 2).padStart(2, '0')}:${i % 2 ? '30' : '15'}`;
    const who = names[i % names.length]!;
    if (kind === 0)
      return {
        id: `ev-old-${i}`,
        at: at(daysAgo, time),
        actorKind: 'agent',
        actor: 'Outreach agent',
        type: 'send',
        action: 'Sent a sequence follow-up',
        subject: who,
        approvedBy: 'Priya Shah',
      };
    if (kind === 1)
      return {
        id: `ev-old-${i}`,
        at: at(daysAgo, time),
        actorKind: 'person',
        actor: 'Priya Shah',
        type: 'data-access',
        action: 'Opened a resume',
        subject: who,
      };
    return {
      id: `ev-old-${i}`,
      at: at(daysAgo, time),
      actorKind: 'system',
      actor: 'System',
      type: 'connection',
      action: 'Synced job board postings',
      subject: 'Indeed',
    };
  });

  return [...fixed, ...older];
}
