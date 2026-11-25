'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { activeHref, isCommandShortcut } from '../../nav';
import { CommandMenu, type CommandItem } from './command-menu';
import { Icon, type IconName } from './icon';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export interface LinkRenderProps {
  href: string;
  className?: string;
  'aria-current'?: 'page';
  children: React.ReactNode;
}

export interface AppShellProps {
  /** Product name shown beside the brand mark, e.g. "Recruiter". */
  product: string;
  /** Where the brand mark links to. */
  homeHref: string;
  nav: readonly NavItem[];
  /** The current pathname; the app passes it in so this package stays framework-agnostic. */
  currentPath: string;
  commands: readonly CommandItem[];
  /** Called when a command is chosen. Defaults to a full page navigation. */
  onNavigate?: (href: string) => void;
  /** Render a link, e.g. with next/link. Defaults to a plain <a>. */
  renderLink?: (props: LinkRenderProps) => React.ReactNode;
  children: React.ReactNode;
}

const defaultLink = ({ children, ...props }: LinkRenderProps) => <a {...props}>{children}</a>;

/** Look D app shell: soft sidebar with icon tiles, a ⌘K command bar and the page area. */
export function AppShell({
  product,
  homeHref,
  nav,
  currentPath,
  commands,
  onNavigate,
  renderLink = defaultLink,
  children,
}: AppShellProps) {
  const [open, setOpen] = React.useState(false);
  const [shortcut, setShortcut] = React.useState('⌘K');
  const current = activeHref(nav, currentPath);

  React.useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut('Ctrl K');
    const onKey = (e: KeyboardEvent) => {
      if (isCommandShortcut(e)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navigate = (href: string) => (onNavigate ? onNavigate(href) : window.location.assign(href));

  const brand = renderLink({
    href: homeHref,
    className: 'flex min-h-target items-center gap-2.5 rounded-lg px-2',
    children: (
      <>
        {/* Placeholder mark until the official Insyght logo is supplied. */}
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-sm bg-brand font-display text-[17px] leading-none text-brand-foreground"
        >
          i
        </span>
        <span className="text-heading">
          Insyght <span className="font-normal text-muted-foreground">{product}</span>
        </span>
      </>
    ),
  });

  const commandButton = (className?: string) => (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-haspopup="dialog"
      aria-keyshortcuts="Meta+K Control+K"
      className={cn(
        'flex min-h-target items-center gap-2 rounded-lg bg-card px-3 text-[13px] leading-5 text-muted-foreground shadow-card transition-colors duration-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <Icon name="search" size={14} />
      <span className="flex-1 whitespace-nowrap text-left">Search or jump to</span>
      <kbd className="rounded-sm border border-border px-1.5 font-mono text-caption">
        {shortcut}
      </kbd>
    </button>
  );

  return (
    <div className="min-h-dvh bg-background text-foreground md:flex">
      <aside
        aria-label="Primary"
        className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-4 px-3 py-4 md:flex"
      >
        {brand}
        {commandButton()}
        <nav aria-label="Main">
          <ul className="flex flex-col gap-0.5" role="list">
            {nav.map((item) => {
              const isActive = item.href === current;
              return (
                <li key={item.href}>
                  {renderLink({
                    href: item.href,
                    'aria-current': isActive ? 'page' : undefined,
                    className: cn(
                      'flex min-h-target items-center gap-3 rounded-lg px-2 text-sm transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'bg-card font-semibold text-foreground shadow-card'
                        : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
                    ),
                    children: (
                      <>
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-sm',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card text-muted-foreground shadow-card',
                          )}
                        >
                          <Icon name={item.icon} size={15} />
                        </span>
                        {item.label}
                      </>
                    ),
                  })}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <header className="flex items-center justify-between gap-3 px-4 py-2 md:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search or jump to"
          aria-haspopup="dialog"
          className="flex h-control w-control items-center justify-center rounded-lg bg-card shadow-card"
        >
          <Icon name="search" />
        </button>
      </header>
      <nav aria-label="Main" className="overflow-x-auto px-4 md:hidden">
        <ul className="flex gap-1" role="list">
          {nav.map((item) => {
            const isActive = item.href === current;
            return (
              <li key={item.href}>
                {renderLink({
                  href: item.href,
                  'aria-current': isActive ? 'page' : undefined,
                  className: cn(
                    'flex min-h-target items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm',
                    isActive
                      ? 'bg-card font-semibold text-foreground shadow-card'
                      : 'text-muted-foreground',
                  ),
                  children: (
                    <>
                      <Icon name={item.icon} size={15} />
                      {item.label}
                    </>
                  ),
                })}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0 flex-1">{children}</div>

      <CommandMenu
        commands={commands}
        open={open}
        onOpenChange={setOpen}
        onSelect={(c) => navigate(c.href)}
      />
    </div>
  );
}
