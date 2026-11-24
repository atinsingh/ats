// Regenerates src/styles/tokens.css from src/tokens.ts.
//   pnpm --filter @jobocate/ui tokens
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { renderCss } from '../src/tokens.ts';

const out = fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url));
writeFileSync(out, renderCss());
console.log(`wrote ${out}`);
