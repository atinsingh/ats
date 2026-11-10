import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(214 32% 91%)',
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(222 47% 11%)',
        jobocate: {
          coral: '#e85d4c',
          coralHover: '#d14a3a',
          ink: '#0f172a',
          muted: '#64748b',
        },
      },
      backgroundImage: {
        'landing-gradient':
          'radial-gradient(ellipse 120% 90% at 50% -10%, rgb(255 232 228) 0%, rgb(255 250 248) 42%, rgb(255 255 255) 72%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
