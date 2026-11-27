import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The design system's type scale names (tokens.ts `typeScale`). tailwind-merge only knows
 * Tailwind's own sizes, so without these it reads `text-caption` as a colour and drops it when a
 * colour such as `text-info` follows. test/utils.test.ts keeps this list in step with the tokens.
 */
export const TYPE_SCALE_NAMES = [
  'display',
  'metric',
  'section-title',
  'title',
  'heading',
  'subheading',
  'body',
  'small',
  'caption',
  'label',
] as const;

const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: [...TYPE_SCALE_NAMES] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
