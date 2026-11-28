import { test } from 'node:test';
import assert from 'node:assert/strict';

import { activeHref, filterCommands, isCommandShortcut, type Command } from '../src/nav.ts';

const nav = [
  { href: '/recruiter/dashboard' },
  { href: '/recruiter/jobs' },
  { href: '/recruiter/jobs/new' },
  { href: '/recruiter/pipeline' },
];

test('activeHref picks the longest matching prefix on a segment boundary', () => {
  assert.equal(activeHref(nav, '/recruiter/jobs'), '/recruiter/jobs');
  assert.equal(activeHref(nav, '/recruiter/jobs/123'), '/recruiter/jobs');
  assert.equal(activeHref(nav, '/recruiter/jobs/new'), '/recruiter/jobs/new');
  assert.equal(activeHref(nav, '/recruiter/jobs/'), '/recruiter/jobs');
  assert.equal(activeHref(nav, '/recruiter/jobsboard'), null);
  assert.equal(activeHref(nav, '/recruiter/candidates/9'), null);
  assert.equal(activeHref(nav, ''), null);
});

const commands: Command[] = [
  { id: 'dash', label: 'Dashboard', href: '/d' },
  { id: 'jobs', label: 'Jobs', href: '/j', keywords: ['requisitions', 'roles'] },
  { id: 'new', label: 'New job', href: '/n', keywords: ['create'] },
  { id: 'pipe', label: 'Pipeline', href: '/p', keywords: ['applicants'] },
];

test('filterCommands returns everything in order for an empty query', () => {
  assert.deepEqual(
    filterCommands(commands, '  ').map((c) => c.id),
    ['dash', 'jobs', 'new', 'pipe'],
  );
});

test('filterCommands ranks label prefix, then word prefix, then substring, then keyword', () => {
  assert.deepEqual(
    filterCommands(commands, 'job').map((c) => c.id),
    ['jobs', 'new'],
  );
  assert.deepEqual(
    filterCommands(commands, 'line').map((c) => c.id),
    ['pipe'],
  );
  assert.deepEqual(
    filterCommands(commands, 'create').map((c) => c.id),
    ['new'],
  );
  assert.deepEqual(
    filterCommands(commands, 'APPL').map((c) => c.id),
    ['pipe'],
  );
  assert.deepEqual(filterCommands(commands, 'zzz'), []);
});

test('isCommandShortcut accepts Cmd+K and Ctrl+K only', () => {
  assert.ok(
    isCommandShortcut({ key: 'k', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false }),
  );
  assert.ok(
    isCommandShortcut({ key: 'K', metaKey: false, ctrlKey: true, altKey: false, shiftKey: false }),
  );
  assert.ok(
    !isCommandShortcut({
      key: 'k',
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
    }),
  );
  assert.ok(
    !isCommandShortcut({ key: 'k', metaKey: true, ctrlKey: false, altKey: true, shiftKey: false }),
  );
  assert.ok(
    !isCommandShortcut({ key: 'k', metaKey: false, ctrlKey: true, altKey: false, shiftKey: true }),
  );
  assert.ok(
    !isCommandShortcut({ key: 'j', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false }),
  );
});
