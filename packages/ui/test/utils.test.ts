import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TYPE_SCALE_NAMES, cn } from '../src/lib/utils.ts';
import { typeScale } from '../src/tokens.ts';

test('the merge list matches the type scale tokens', () => {
  assert.deepEqual([...TYPE_SCALE_NAMES].sort(), Object.keys(typeScale).sort());
});

test('a type scale size and a colour both survive the merge', () => {
  assert.equal(
    cn('text-caption font-semibold', 'text-info'),
    'text-caption font-semibold text-info',
  );
  assert.equal(cn('text-body', 'text-muted-foreground'), 'text-body text-muted-foreground');
  // Two sizes still conflict, and the later one wins.
  assert.equal(cn('text-caption', 'text-sm'), 'text-sm');
  assert.equal(cn('text-sm', 'text-caption'), 'text-caption');
  // Two colours still conflict.
  assert.equal(cn('text-info', 'text-danger'), 'text-danger');
});
