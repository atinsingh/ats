import { control, duration, easing, fonts, radius, semanticNames } from './src/tokens.ts';

/**
 * Tailwind preset for every Insyght app. Use it with the stylesheet:
 *
 *   // tailwind.config.ts
 *   import preset from '@jobocate/ui/tailwind-preset';
 *   export default { presets: [preset], content: [...] };
 *
 *   // app/globals.css
 *   @import '@jobocate/ui/styles/tokens.css';
 */
const colors = Object.fromEntries(
  semanticNames.map((name) => [name, `rgb(var(--${name}) / <alpha-value>)`]),
) as Record<(typeof semanticNames)[number], string>;

const preset = {
  darkMode: ['class'] as ['class'],
  content: [] as string[],
  theme: {
    borderRadius: {
      none: '0px',
      sm: `${radius.sm}px`,
      DEFAULT: `${radius.sm}px`,
      md: `${radius.md}px`,
      lg: `${radius.lg}px`,
      xl: `${radius.xl}px`,
      full: '9999px',
    },
    extend: {
      colors,
      fontFamily: {
        sans: [fonts.sans],
        display: [fonts.display],
        mono: [fonts.mono],
      },
      height: {
        control: `${control.md}px`,
        'control-sm': `${control.sm}px`,
        'control-lg': `${control.lg}px`,
      },
      width: { control: `${control.md}px` },
      minHeight: { target: `${control.target}px` },
      minWidth: { target: `${control.target}px` },
      boxShadow: { card: 'var(--shadow-card)', raised: 'var(--shadow-raised)' },
      transitionDuration: {
        DEFAULT: `${duration.fast}ms`,
        fast: `${duration.fast}ms`,
        base: `${duration.base}ms`,
        slow: `${duration.slow}ms`,
      },
      transitionTimingFunction: {
        DEFAULT: easing.standard,
        standard: easing.standard,
        spring: easing.spring,
      },
      scale: { press: '0.98' },
    },
  },
};

export default preset;
