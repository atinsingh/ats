import assert from 'node:assert/strict';
import { test } from 'node:test';

import { colleagueName } from '../src/lib/colleagues/colleagues.ts';

test('a colleague reads by display name, else by email name', () => {
  assert.equal(
    colleagueName({ displayName: ' Sample Person ', email: 'x@example.test' }),
    'Sample Person',
  );
  assert.equal(
    colleagueName({ displayName: null, email: 'sample.person@example.test' }),
    'sample.person',
  );
});
