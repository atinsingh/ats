'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell, type CommandItem, type NavItem } from '@jobocate/ui';

const NAV: NavItem[] = [
  { href: '/recruiter/today', label: 'Command center', icon: 'home' },
  { href: '/recruiter/review', label: 'Review queue', icon: 'review' },
  { href: '/recruiter/inbox', label: 'Inbox', icon: 'inbox' },
  { href: '/recruiter/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/recruiter/jobs', label: 'Jobs', icon: 'briefcase' },
  { href: '/recruiter/pipeline', label: 'Pipeline', icon: 'columns' },
  { href: '/recruiter/talent', label: 'Talent search', icon: 'search' },
  { href: '/recruiter/candidates', label: 'Candidates', icon: 'users' },
  { href: '/recruiter/sequences', label: 'Sequences', icon: 'repeat' },
  { href: '/recruiter/submittals', label: 'Submittals', icon: 'send' },
  { href: '/recruiter/interviews', label: 'Interviews', icon: 'calendar' },
  { href: '/recruiter/placements', label: 'Placements', icon: 'handshake' },
  { href: '/recruiter/clients', label: 'Clients', icon: 'building' },
  { href: '/recruiter/sourcing', label: 'Client sourcing', icon: 'target' },
  { href: '/recruiter/reports', label: 'Reports', icon: 'chart' },
  { href: '/recruiter/agents', label: 'Agents', icon: 'bot' },
  { href: '/recruiter/activity', label: 'Activity log', icon: 'history' },
  { href: '/recruiter/settings', label: 'Settings', icon: 'settings' },
];

const KEYWORDS: Record<string, string[]> = {
  '/recruiter/talent': ['boolean', 'search string', 'x-ray', 'linkedin', 'sourcing', 'shortlist'],
  '/recruiter/sequences': ['follow-up', 'templates', 'drip', 'cadence', 'outreach', 'casl'],
  '/recruiter/activity': ['audit', 'history', 'log', 'overrides', 'compliance', 'who did what'],
  '/recruiter/today': ['home', 'today', 'priorities', 'overview', 'start'],
  '/recruiter/candidates': ['people', 'talent', 'resumes', 'profiles'],
  '/recruiter/review': ['approvals', 'approve', 'proposals', 'agents'],
  '/recruiter/jobs': ['requisitions', 'roles', 'openings'],
  '/recruiter/pipeline': ['applicants', 'candidates', 'stages'],
  '/recruiter/clients': ['companies', 'accounts', 'customers', 'msa', 'territory'],
  '/recruiter/sourcing': ['prospects', 'leads', 'business development', 'pitch', 'intro'],
  '/recruiter/inbox': ['messages', 'email', 'sms', 'replies', 'conversations'],
  '/recruiter/interviews': ['schedule', 'calendar', 'feedback', 'screening', 'invite'],
  '/recruiter/placements': ['contractors', 'assignments', 'extensions', 'redeploy', 'margin'],
  '/recruiter/reports': ['analytics', 'funnel', 'metrics', 'cost per start', 'export'],
  '/recruiter/agents': ['automation', 'autonomy', 'runs', 'ai policy', 'pause'],
  '/recruiter/settings': ['connections', 'integrations', 'out of office', 'mailbox', 'preferences'],
  '/recruiter/submittals': ['submissions', 'clients', 'follow-up', 'vms'],
};

const COMMANDS: CommandItem[] = [
  ...NAV.map((n) => ({
    id: n.href,
    label: n.label,
    href: n.href,
    icon: n.icon,
    group: 'Go to',
    keywords: KEYWORDS[n.href],
  })),
  {
    id: 'new-job',
    label: 'New job',
    href: '/recruiter/jobs/new',
    icon: 'plus',
    group: 'Create',
    keywords: ['create', 'requisition', 'post'],
  },
];

/** Client wrapper that binds the shared AppShell to Next routing. */
export function RecruiterAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <AppShell
      product="Recruiter"
      homeHref="/recruiter/today"
      nav={NAV}
      currentPath={pathname}
      commands={COMMANDS}
      onNavigate={(href) => router.push(href)}
      renderLink={({ children: label, ...props }) => (
        <Link {...props} prefetch={false}>
          {label}
        </Link>
      )}
    >
      {children}
    </AppShell>
  );
}
