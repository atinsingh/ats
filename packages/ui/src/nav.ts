/**
 * Framework-agnostic navigation logic for the app shell: which nav item is active, how the
 * command menu filters, and which keystroke opens it. Kept pure so it is unit-tested.
 */

export interface Command {
  id: string;
  label: string;
  href: string;
  /** Extra words that should match, e.g. "requisitions" for Jobs. */
  keywords?: readonly string[];
  /** Optional group heading, e.g. "Go to" or "Create". */
  group?: string;
}

/** The href of the nav item that owns `pathname`: the longest prefix on a "/" boundary. */
export function activeHref(
  items: ReadonlyArray<{ href: string }>,
  pathname: string,
): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  let best: string | null = null;
  for (const { href } of items) {
    const matches = path === href || path.startsWith(`${href}/`);
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

/**
 * Filter and rank commands for a query. Rank: label starts with the query, then a word in the
 * label starts with it, then the label contains it, then a keyword starts with it. Ties keep the
 * original order. An empty query returns every command in order.
 */
export function filterCommands<C extends Command>(commands: readonly C[], query: string): C[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...commands];
  const rank = (c: C): number => {
    const label = c.label.toLowerCase();
    if (label.startsWith(q)) return 0;
    if (label.split(/\s+/).some((w) => w.startsWith(q))) return 1;
    if (label.includes(q)) return 2;
    if (c.keywords?.some((k) => k.toLowerCase().startsWith(q))) return 3;
    return -1;
  };
  return commands
    .map((c, i) => ({ c, i, r: rank(c) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.c);
}

export interface ShortcutEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/** ⌘K on macOS or Ctrl+K elsewhere, with no other modifiers. */
export function isCommandShortcut(e: ShortcutEvent): boolean {
  return e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey;
}
