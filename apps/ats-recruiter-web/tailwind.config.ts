import type { Config } from 'tailwindcss';
import preset from '@jobocate/ui/tailwind-preset';

export default {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  plugins: [],
} satisfies Config;
