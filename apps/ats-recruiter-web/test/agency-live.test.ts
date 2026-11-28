import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { DeskMetrics, DeskRoles } from '@jobocate/api-sdk';

import { duplicateItems, toDesks } from '../src/lib/agency/live.ts';

const metrics: DeskMetrics = {
  days: 7,
  since: '2026-11-21T00:00:00Z',
  desks: [
    { userId: 'u-ana', submittals: 4, interviews: 2, starts: 1, queue: 3 },
    { userId: 'u-me', submittals: 1, interviews: 0, starts: 0, queue: 12 },
  ],
  duplicates: [{ candidateProfileId: 'c1', clientId: 'k1', ownerUserIds: ['u-ana', 'u-me'] }],
};
const roles: DeskRoles = {
  days: 7,
  since: '2026-11-21T00:00:00Z',
  desks: [
    { userId: 'u-ana', roles: 5, newClients: 1 },
    { userId: 'u-ghost', roles: 2, newClients: 0 },
  ],
};
const colleagues = new Map([['u-ana', 'Ana Silva']]);

test('joins both services into one row per person, with untracked focus left empty', () => {
  const desks = toDesks(metrics, roles, 'u-me', colleagues);
  assert.equal(desks.length, 3);
  const ana = desks.find((d) => d.id === 'u-ana');
  assert.deepEqual(ana, {
    id: 'u-ana',
    name: 'Ana Silva',
    focus: '',
    roles: 5,
    submittals: 4,
    interviews: 2,
    starts: 1,
    queue: 3,
    newClients: 1,
  });
  assert.equal(desks.find((d) => d.id === 'u-me')?.name, 'You');
  assert.equal(desks.find((d) => d.id === 'u-me')?.roles, 0);
  assert.equal(desks.find((d) => d.id === 'u-ghost')?.name, 'Teammate');
  assert.equal(desks.find((d) => d.id === 'u-ghost')?.submittals, 0);
});

test('a duplicate names the client, candidate and desks, and needs a manager', () => {
  const names = {
    candidates: new Map([['c1', 'Priya Raman']]),
    jobs: new Map<string, string>(),
    clients: new Map([['k1', 'Woodgrove']]),
  };
  const [item] = duplicateItems(metrics.duplicates, names, 'u-me', colleagues);
  assert.equal(item.kind, 'duplicate');
  assert.equal(item.blocking, true);
  assert.equal(
    item.detail,
    'Woodgrove: Priya Raman has open submittals from Ana Silva and You. Decide which desk owns it.',
  );
  const [unknown] = duplicateItems(
    metrics.duplicates,
    { candidates: new Map(), jobs: new Map(), clients: new Map() },
    'u-me',
    new Map(),
  );
  assert.match(unknown.detail, /^A client: A candidate has open submittals from Teammate and You/);
});
