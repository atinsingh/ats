import type { Check, Proposal } from '../review/queue';

/**
 * Inbox logic. Conversations arrive from the recruiter's mailbox, SMS number and VMS alerts,
 * linked to a person and job. The agent may draft a reply; a person sends, edits or discards it
 * through the Review queue's rules. Pure and unit-tested (test/inbox.test.ts).
 */

export type Channel = 'email' | 'sms' | 'vms';
export type Party = 'candidate' | 'client' | 'contractor' | 'system';

export const CHANNEL_LABEL: Record<Channel, string> = {
  email: 'Email',
  sms: 'SMS',
  vms: 'VMS alert',
};

export interface Message {
  from: 'them' | 'you';
  at: string;
  body: string;
}

export interface Conversation {
  id: string;
  who: string;
  party: Party;
  channel: Channel;
  subject: string;
  /** How it is linked, e.g. "Candidate, QA Lead at Contoso". */
  context: string;
  messages: Message[];
  unread: boolean;
  link?: {
    job?: string;
    stage?: string;
    /** Recorded consent to contact on this channel, if any. */
    consent?: { channel: Channel; at: string };
    owner: string;
  };
  suggestion?: {
    draft: string;
    draftedAt: string;
    /** Where the facts in the draft came from. */
    basis: string;
    checks: Check[];
  };
}

export const lastMessage = (c: Conversation): Message | undefined =>
  c.messages[c.messages.length - 1];

const lastAt = (c: Conversation) => Date.parse(lastMessage(c)?.at ?? '1970-01-01T00:00:00Z');

export function sortByLatest(rows: readonly Conversation[]): Conversation[] {
  return [...rows].sort((a, b) => lastAt(b) - lastAt(a) || a.who.localeCompare(b.who));
}

export interface InboxFilter {
  channel?: Channel | 'all';
  from?: 'all' | 'candidates' | 'clients';
}

export function filterConversations(rows: readonly Conversation[], f: InboxFilter): Conversation[] {
  return rows.filter((c) => {
    if (f.channel && f.channel !== 'all' && c.channel !== f.channel) return false;
    if (f.from === 'candidates' && c.party !== 'candidate' && c.party !== 'contractor')
      return false;
    if (f.from === 'clients' && c.party !== 'client') return false;
    return true;
  });
}

/** Unread, counting ids the person has opened in this session as read. */
export const unreadCount = (rows: readonly Conversation[], opened: ReadonlySet<string>) =>
  rows.filter((c) => c.unread && !opened.has(c.id)).length;

/**
 * Why a reply can't be sent from here, or null when it can. A person who wrote to you can be
 * answered on the same channel; otherwise recorded consent on that channel is needed.
 */
export function replyBlockedReason(c: Conversation): string | null {
  if (c.channel === 'vms' || c.party === 'system')
    return 'VMS alerts are notifications. Act on them in the VMS or as a job draft.';
  const wroteToYou = c.messages.some((m) => m.from === 'them');
  if (wroteToYou) return null;
  if (c.link?.consent?.channel === c.channel) return null;
  return `No consent recorded to contact ${c.who} by ${CHANNEL_LABEL[c.channel]}.`;
}

/** The agent's suggested reply as a Review queue proposal, or null when there is none. */
export function toReplyProposal(c: Conversation): Proposal | null {
  if (!c.suggestion) return null;
  const blocked = replyBlockedReason(c);
  const checks: Check[] = [
    ...(blocked ? [{ status: 'fail' as const, title: 'Cannot reply here', detail: blocked }] : []),
    ...c.suggestion.checks,
  ];
  const via = c.channel === 'sms' ? 'by SMS from your number' : 'by email from your mailbox';
  return {
    id: `reply-${c.id}`,
    kind: 'message',
    agent: 'Outreach',
    title: `Reply to ${c.who}`,
    summary: c.subject,
    draft: c.suggestion.draft,
    destination: `${via} to ${c.who}`,
    dueAt: lastMessage(c)?.at ?? c.suggestion.draftedAt,
    dueLabel: 'Reply',
    approveLabel: 'Send reply',
    checks,
    evidence: [],
  };
}

/** 9:12 AM today, Yesterday, or Nov 22, in the viewer's time zone. */
export function formatWhen(iso: string, now: Date, timeZone?: string): string {
  const d = new Date(iso);
  const dayKey = (x: Date) => x.toLocaleDateString('en-CA', { timeZone });
  if (dayKey(d) === dayKey(now))
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayKey(d) === dayKey(yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
}
