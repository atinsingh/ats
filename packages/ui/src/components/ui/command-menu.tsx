'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { filterCommands, type Command } from '../../nav';
import { Icon, type IconName } from './icon';

export interface CommandItem extends Command {
  icon?: IconName;
}

export interface CommandMenuProps {
  commands: readonly CommandItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (command: CommandItem) => void;
}

/**
 * ⌘K command menu: a modal <dialog> holding a combobox and a listbox. The native dialog gives
 * focus containment, Esc to close and focus return; the combobox follows the ARIA 1.2 pattern
 * with aria-activedescendant, so focus stays in the input while ↑/↓ move the selection.
 */
export function CommandMenu({ commands, open, onOpenChange, onSelect }: CommandMenuProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const listId = React.useId();
  const results = React.useMemo(() => filterCommands(commands, query), [commands, query]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery('');
      setActive(0);
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const choose = (command: CommandItem | undefined) => {
    if (!command) return;
    onOpenChange(false);
    onSelect(command);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + results.length) % results.length);
    } else if (e.key === 'Home' || e.key === 'End') {
      if (results.length === 0) return;
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : results.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Read the live input value: a fast typist can press Enter before React re-renders the list.
      const live = e.currentTarget.value;
      choose(live === query ? results[active] : filterCommands(commands, live)[0]);
    }
  };

  const optionId = (i: number) => `${listId}-option-${i}`;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Search or jump to"
      // Esc fires `cancel` at once but `close` a task later. Sync state on cancel, and ignore a
      // late `close` that arrives after ⌘K has already reopened the dialog.
      onCancel={() => onOpenChange(false)}
      onClose={() => {
        if (!dialogRef.current?.open) onOpenChange(false);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      className="mt-[12vh] w-[min(560px,calc(100vw-32px))] rounded-xl bg-popover p-0 text-popover-foreground shadow-raised backdrop:bg-foreground/20"
    >
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Icon name="search" className="shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results.length ? optionId(active) : undefined}
          aria-label="Search or jump to"
          placeholder="Search or jump to…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-control-lg w-full bg-transparent text-body outline-none placeholder:text-muted-foreground"
        />
        <kbd className="rounded-sm border border-border px-1.5 font-mono text-caption text-muted-foreground">
          esc
        </kbd>
      </div>
      <ul id={listId} role="listbox" aria-label="Commands" className="max-h-80 overflow-y-auto p-2">
        {results.map((c, i) => (
          <li
            key={c.id}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            onMouseMove={() => setActive(i)}
            onClick={() => choose(c)}
            className={cn(
              'flex min-h-target cursor-pointer items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-fast',
              i === active ? 'bg-accent text-accent-foreground' : 'text-foreground',
            )}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-muted text-muted-foreground">
              <Icon name={c.icon ?? 'search'} size={14} />
            </span>
            <span className="flex-1">{c.label}</span>
            {c.group ? <span className="text-caption text-muted-foreground">{c.group}</span> : null}
            {i === active ? (
              <Icon name="enter" size={14} className="text-muted-foreground" />
            ) : null}
          </li>
        ))}
        {results.length === 0 ? (
          <li
            role="presentation"
            className="px-3 py-6 text-center text-small text-muted-foreground"
          >
            No matches for “{query.trim()}”
          </li>
        ) : null}
      </ul>
    </dialog>
  );
}
