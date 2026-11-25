/**
 * Insyght design tokens: the single source of truth for colour, type, space, radius, motion
 * and elevation. `scripts/build-tokens.ts` renders them to `src/styles/tokens.css`, and
 * `tailwind-preset.ts` maps the semantic names onto those CSS variables.
 *
 * Rules (enforced by test/tokens.test.ts):
 * - Ink (`primary`) is the human decision. Indigo (`agent-*`) marks agent work only.
 * - Every text/surface pair meets WCAG 2.2 AA in light and dark.
 * - Spacing is a 4pt grid. Radii are 8, 10, 12 and 16 only (plus full).
 * - Motion lasts 200 to 300ms.
 */

export const primitives = {
  'zinc-0': '#fdfdfd',
  'zinc-50': '#f7f7f8',
  'zinc-100': '#f0f0f2',
  'zinc-200': '#e4e4e7',
  'zinc-300': '#d4d4d8',
  'zinc-400': '#a1a1aa',
  'zinc-500': '#71717a',
  'zinc-600': '#52525b',
  'zinc-700': '#3f3f46',
  'zinc-800': '#27272a',
  'zinc-900': '#18181b',
  'zinc-950': '#09090b',
  /** Insyght navy, from insyght.ai (theme-color). Placeholder until the official palette lands. */
  'navy-950': '#070b1e',
  'indigo-50': '#eef2ff',
  'indigo-200': '#c7d2fe',
  'indigo-300': '#a5b4fc',
  'indigo-600': '#4f46e5',
  'indigo-800': '#3730a3',
  'indigo-950': '#1e1b4b',
  'green-50': '#f0fdf4',
  'green-400': '#4ade80',
  'green-700': '#15803d',
  'green-925': '#1f3429',
  'amber-50': '#fffbeb',
  'amber-400': '#fbbf24',
  'amber-700': '#b45309',
  'amber-925': '#382f1c',
  'red-50': '#fef2f2',
  'red-400': '#f87171',
  'red-700': '#b91c1c',
  'red-925': '#372427',
  'sky-50': '#f0f9ff',
  'sky-400': '#38bdf8',
  'sky-700': '#0369a1',
  'sky-925': '#1c2f3a',
} as const;

export type Primitive = keyof typeof primitives;

export const semanticNames = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'muted',
  'muted-foreground',
  'border',
  'input',
  'ring',
  'primary',
  'primary-foreground',
  'primary-hover',
  'secondary',
  'secondary-foreground',
  'secondary-hover',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'agent',
  'agent-soft',
  'agent-foreground',
  'agent-border',
  'success',
  'success-soft',
  'warning',
  'warning-soft',
  'danger',
  'danger-soft',
  'info',
  'info-soft',
  'brand',
  'brand-foreground',
] as const;

export type SemanticName = (typeof semanticNames)[number];
export type Theme = Record<SemanticName, Primitive>;

export const light: Theme = {
  background: 'zinc-100',
  foreground: 'zinc-900',
  card: 'zinc-0',
  'card-foreground': 'zinc-900',
  popover: 'zinc-0',
  'popover-foreground': 'zinc-900',
  muted: 'zinc-50',
  'muted-foreground': 'zinc-600',
  border: 'zinc-200',
  input: 'zinc-500',
  ring: 'indigo-600',
  primary: 'zinc-900',
  'primary-foreground': 'zinc-50',
  'primary-hover': 'zinc-700',
  secondary: 'zinc-100',
  'secondary-foreground': 'zinc-900',
  'secondary-hover': 'zinc-200',
  accent: 'zinc-100',
  'accent-foreground': 'zinc-900',
  destructive: 'red-700',
  'destructive-foreground': 'zinc-0',
  agent: 'indigo-600',
  'agent-soft': 'indigo-50',
  'agent-foreground': 'indigo-800',
  'agent-border': 'indigo-200',
  success: 'green-700',
  'success-soft': 'green-50',
  warning: 'amber-700',
  'warning-soft': 'amber-50',
  danger: 'red-700',
  'danger-soft': 'red-50',
  info: 'sky-700',
  'info-soft': 'sky-50',
  brand: 'navy-950',
  'brand-foreground': 'zinc-50',
};

export const dark: Theme = {
  background: 'zinc-950',
  foreground: 'zinc-50',
  card: 'zinc-900',
  'card-foreground': 'zinc-50',
  popover: 'zinc-900',
  'popover-foreground': 'zinc-50',
  muted: 'zinc-800',
  'muted-foreground': 'zinc-400',
  border: 'zinc-800',
  input: 'zinc-500',
  ring: 'indigo-300',
  primary: 'zinc-50',
  'primary-foreground': 'zinc-900',
  'primary-hover': 'zinc-300',
  secondary: 'zinc-800',
  'secondary-foreground': 'zinc-50',
  'secondary-hover': 'zinc-700',
  accent: 'zinc-800',
  'accent-foreground': 'zinc-50',
  destructive: 'red-400',
  'destructive-foreground': 'zinc-950',
  agent: 'indigo-300',
  'agent-soft': 'indigo-950',
  'agent-foreground': 'indigo-200',
  'agent-border': 'indigo-800',
  success: 'green-400',
  'success-soft': 'green-925',
  warning: 'amber-400',
  'warning-soft': 'amber-925',
  danger: 'red-400',
  'danger-soft': 'red-925',
  info: 'sky-400',
  'info-soft': 'sky-925',
  brand: 'zinc-50',
  'brand-foreground': 'navy-950',
};

/** Text pairs that must reach 4.5:1: [text, surface]. */
export const textPairs: ReadonlyArray<readonly [SemanticName, SemanticName]> = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['foreground', 'muted'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'muted'],
  ['primary-foreground', 'primary'],
  ['primary-foreground', 'primary-hover'],
  ['secondary-foreground', 'secondary'],
  ['secondary-foreground', 'secondary-hover'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
  ['agent', 'card'],
  ['agent-foreground', 'agent-soft'],
  ['success', 'card'],
  ['success', 'success-soft'],
  ['warning', 'card'],
  ['warning', 'warning-soft'],
  ['danger', 'card'],
  ['danger', 'danger-soft'],
  ['info', 'card'],
  ['info', 'info-soft'],
  ['brand-foreground', 'brand'],
];

/** Non-text pairs (control edges, focus ring) that must reach 3:1. */
export const uiPairs: ReadonlyArray<readonly [SemanticName, SemanticName]> = [
  ['input', 'card'],
  ['input', 'background'],
  ['ring', 'card'],
  ['ring', 'background'],
];

/** 4pt spacing grid, in px. Tailwind's numeric scale stays available; these are named steps. */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** The only radii, in px. */
export const radius = { sm: 8, md: 10, lg: 12, xl: 16 } as const;

/** Control heights, in px. Every target is at least 44px. */
export const control = { sm: 36, md: 44, lg: 48, target: 44 } as const;

/** Motion durations, in ms. */
export const duration = { fast: 200, base: 250, slow: 300 } as const;

export const easing = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  spring: 'cubic-bezier(0.34, 1.36, 0.64, 1)',
} as const;

export const fonts = {
  sans: 'var(--font-inter), Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  display: 'var(--font-newsreader), Newsreader, "Iowan Old Style", Georgia, serif',
  mono: 'var(--font-jetbrains-mono), "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

/** Type scale: [size px, line-height px, weight, letter-spacing em, family]. */
export const typeScale = {
  display: [40, 44, 400, -0.02, 'display'],
  metric: [40, 44, 400, -0.02, 'display'],
  'section-title': [22, 28, 500, -0.01, 'display'],
  title: [20, 28, 600, -0.012, 'sans'],
  heading: [16, 24, 600, -0.006, 'sans'],
  subheading: [14, 20, 600, 0, 'sans'],
  body: [14, 20, 400, 0, 'sans'],
  small: [13, 20, 400, 0, 'sans'],
  caption: [12, 16, 400, 0, 'sans'],
  label: [12, 16, 600, 0.02, 'sans'],
} as const satisfies Record<
  string,
  readonly [number, number, 400 | 500 | 600, number, keyof typeof fonts]
>;

export const shadows = {
  light: {
    card: '0 1px 2px rgba(24, 24, 27, 0.05), 0 0 0 1px rgba(24, 24, 27, 0.05)',
    raised:
      '0 1px 2px rgba(24, 24, 27, 0.04), 0 8px 24px -8px rgba(24, 24, 27, 0.14), 0 0 0 1px rgba(24, 24, 27, 0.05)',
  },
  dark: {
    card: '0 0 0 1px #27272a',
    raised: '0 0 0 1px #27272a, 0 16px 40px -16px rgba(0, 0, 0, 0.56)',
  },
} as const;

/** "#rrggbb" to "r g b" channels, so Tailwind can apply opacity modifiers. */
export function channels(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** WCAG 2.x relative luminance of "#rrggbb". */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Render every token as CSS custom properties. */
export function renderCss(): string {
  const themeBlock = (t: Theme) =>
    semanticNames.map((name) => `  --${name}: ${channels(primitives[t[name]])};`).join('\n');
  const lines = [
    '/* Insyght design tokens. Generated from src/tokens.ts by scripts/build-tokens.ts; do not edit. */',
    ':root {',
    themeBlock(light),
    `  --shadow-card: ${shadows.light.card};`,
    `  --shadow-raised: ${shadows.light.raised};`,
    '  color-scheme: light;',
    '}',
    '.dark {',
    themeBlock(dark),
    `  --shadow-card: ${shadows.dark.card};`,
    `  --shadow-raised: ${shadows.dark.raised};`,
    '  color-scheme: dark;',
    '}',
    ':root {',
    ...Object.entries(space).map(([k, v]) => `  --space-${k}: ${v}px;`),
    ...Object.entries(radius).map(([k, v]) => `  --radius-${k}: ${v}px;`),
    ...Object.entries(control).map(([k, v]) => `  --control-${k}: ${v}px;`),
    ...Object.entries(duration).map(([k, v]) => `  --duration-${k}: ${v}ms;`),
    ...Object.entries(easing).map(([k, v]) => `  --ease-${k}: ${v};`),
    ...Object.entries(fonts).map(([k, v]) => `  --font-family-${k}: ${v};`),
    '  font-synthesis: none;',
    '}',
    ...Object.entries(typeScale).map(
      ([name, [size, lh, weight, tracking, family]]) =>
        `.text-${name} { font-family: var(--font-family-${family}); font-size: ${size}px; line-height: ${lh}px; font-weight: ${weight}; letter-spacing: ${tracking}em; }`,
    ),
    '.text-metric { font-variant-numeric: lining-nums tabular-nums; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }',
    '}',
    '',
  ];
  return lines.join('\n');
}
