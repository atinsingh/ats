import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  contrast,
  control,
  dark,
  duration,
  light,
  primitives,
  radius,
  renderCss,
  semanticNames,
  space,
  textPairs,
  typeScale,
  uiPairs,
} from '../src/tokens.ts';
import preset from '../tailwind-preset.ts';

const themes = { light, dark };

test('contrast() matches known WCAG values', () => {
  assert.equal(contrast('#000000', '#ffffff').toFixed(2), '21.00');
  assert.equal(contrast('#777777', '#ffffff').toFixed(2), '4.48');
});

for (const [name, theme] of Object.entries(themes)) {
  test(`${name}: every semantic token resolves to a primitive`, () => {
    for (const token of semanticNames) {
      assert.ok(primitives[theme[token]], `${token} -> ${theme[token]} is not a primitive`);
    }
  });

  test(`${name}: text pairs meet WCAG 2.2 AA (4.5:1)`, () => {
    for (const [fg, bg] of textPairs) {
      const ratio = contrast(primitives[theme[fg]], primitives[theme[bg]]);
      assert.ok(ratio >= 4.5, `${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
    }
  });

  test(`${name}: control edges and focus ring meet 3:1`, () => {
    for (const [fg, bg] of uiPairs) {
      const ratio = contrast(primitives[theme[fg]], primitives[theme[bg]]);
      assert.ok(ratio >= 3, `${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
    }
  });

  test(`${name}: no pure white or pure black`, () => {
    for (const token of semanticNames) {
      assert.ok(!['#ffffff', '#000000'].includes(primitives[theme[token]]), token);
    }
  });
}

test('ink is the human decision and indigo is the agent', () => {
  for (const theme of [light, dark]) {
    assert.match(theme.primary, /^zinc-/);
    assert.match(theme.agent, /^indigo-/);
    assert.doesNotMatch(theme['primary-foreground'], /^indigo-/);
  }
});

test('spacing is a 4pt grid', () => {
  for (const [k, v] of Object.entries(space)) assert.equal(v % 4, 0, `space-${k} = ${v}`);
});

test('radii are 8, 10, 12 and 16 only', () => {
  assert.deepEqual(
    Object.values(radius).sort((a, b) => a - b),
    [8, 10, 12, 16],
  );
});

test('touch targets are at least 44px', () => {
  assert.ok(control.md >= 44 && control.lg >= 44 && control.target >= 44);
});

test('motion lasts 200 to 300ms', () => {
  for (const v of Object.values(duration)) assert.ok(v >= 200 && v <= 300, `${v}ms`);
});

test('type uses weights 400, 500 and 600 and nothing under 12px', () => {
  for (const [name, [size, , weight]] of Object.entries(typeScale)) {
    assert.ok([400, 500, 600].includes(weight), `${name} weight ${weight}`);
    assert.ok(size >= 12, `${name} size ${size}`);
  }
});

test('tokens.css is generated from tokens.ts and up to date', () => {
  const css = readFileSync(
    fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)),
    'utf8',
  );
  assert.equal(css, renderCss(), 'run: pnpm --filter @jobocate/ui tokens');
});

test('Tailwind preset maps every semantic colour and only the allowed radii', () => {
  const colors = preset.theme.extend.colors as Record<string, string>;
  for (const token of semanticNames) {
    assert.equal(colors[token], `rgb(var(--${token}) / <alpha-value>)`, token);
  }
  const radii = preset.theme.borderRadius as Record<string, string>;
  const px = Object.values(radii)
    .filter((v) => v.endsWith('px'))
    .map((v) => parseInt(v, 10));
  for (const v of px) assert.ok([0, 8, 10, 12, 16, 9999].includes(v), `radius ${v}px`);
});
