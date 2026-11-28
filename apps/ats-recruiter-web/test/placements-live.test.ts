import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PlacementRecord } from '@jobocate/api-sdk';

import { toPlacementRows } from '../src/lib/placements/live.ts';
import { margin, placementFlags, placementStatus } from '../src/lib/placements/placements.ts';

const rec = (over: Partial<PlacementRecord> = {}): PlacementRecord => ({
  id: 'pl1',
  applicationId: 'a1',
  jobId: 'j1',
  candidateProfileId: 'p1',
  clientId: 'c1',
  startDate: '2026-10-01',
  endDate: '2026-12-15',
  billRate: 95,
  payRate: 80,
  extension: 'NONE',
  createdAt: '2026-09-20T12:00:00Z',
  ...over,
});

const names = {
  candidates: new Map([['p1', 'Sample Contractor']]),
  jobs: new Map([['j1', 'Senior Java Developer']]),
  clients: new Map([['c1', 'Harbourline Freight']]),
};

test('maps names, dates, rates and extension', () => {
  const [p] = toPlacementRows([rec({ extension: 'ASKED' })], names);
  assert.equal(p.contractor, 'Sample Contractor');
  assert.equal(p.client, 'Harbourline Freight');
  assert.equal(p.role, 'Senior Java Developer');
  assert.equal(p.start, '2026-10-01');
  assert.equal(p.end, '2026-12-15');
  assert.equal(p.bill, 95);
  assert.equal(p.pay, 80);
  assert.equal(p.extension, 'asked');
});

test('the existing rules run on real rows', () => {
  const [p] = toPlacementRows([rec()], names);
  // Ends in 17 days with no extension asked, and margin is under the 18% floor.
  assert.equal(placementStatus(p, '2026-11-28'), 'ending');
  assert.ok(margin(p) < 0.18);
  assert.ok(placementFlags(p, '2026-11-28').length >= 1);
});

test('missing names and client read plainly', () => {
  const [p] = toPlacementRows([rec({ candidateProfileId: 'x', jobId: 'x', clientId: null })], names);
  assert.equal(p.contractor, 'Candidate not found');
  assert.equal(p.role, 'Job not found');
  assert.equal(p.client, 'No client set');
});
