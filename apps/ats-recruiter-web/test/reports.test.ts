import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  agentRows,
  formatDollars,
  formatShare,
  funnelSteps,
  sourceRows,
  toCsv,
} from '../src/lib/reports/reports.ts';
import {
  representativeAgents,
  representativeFunnel,
  representativeSources,
} from '../src/lib/reports/representative.ts';

test('funnelSteps: share of previous and of top', () => {
  const steps = funnelSteps([
    { stage: 'A', count: 200 },
    { stage: 'B', count: 50 },
    { stage: 'C', count: 0 },
    { stage: 'D', count: 0 },
  ]);
  assert.deepEqual(
    steps.map((s) => [s.ofPrevious, s.ofTop]),
    [
      [null, 1],
      [0.25, 0.25],
      [0, 0],
      [null, 0],
    ],
  );
  assert.deepEqual(funnelSteps([]), []);
  assert.equal(funnelSteps([{ stage: 'A', count: 0 }])[0]!.ofTop, 0);
});

test('sourceRows: cost per start, start rate, most starts first then cheapest', () => {
  const rows = sourceRows([
    { source: 'Paid', submitted: 10, started: 2, spend: 1000 },
    { source: 'Free', submitted: 5, started: 2, spend: 0 },
    { source: 'None', submitted: 0, started: 0, spend: 300 },
  ]);
  assert.deepEqual(
    rows.map((r) => [r.source, r.costPerStart, r.startRate]),
    [
      ['Free', 0, 0.4],
      ['Paid', 500, 0.2],
      ['None', null, null],
    ],
  );
});

test('agentRows: shares of decided proposals and a guard against bad data', () => {
  const [row] = agentRows([
    { agent: 'X', proposals: 10, approved: 6, edited: 2, rejected: 0, minutesSaved: 95 },
  ]);
  assert.equal(row!.decided, 8);
  assert.equal(row!.approvedShare, 0.75);
  assert.equal(row!.rejectedShare, 0);
  assert.equal(row!.hoursSaved, 2);
  assert.equal(
    agentRows([
      { agent: 'Y', proposals: 0, approved: 0, edited: 0, rejected: 0, minutesSaved: 0 },
    ])[0]!.approvedShare,
    null,
  );
  assert.throws(
    () =>
      agentRows([
        { agent: 'Z', proposals: 1, approved: 1, edited: 1, rejected: 0, minutesSaved: 0 },
      ]),
    /more decisions/,
  );
});

test('representative data is consistent: sources add up to the funnel', () => {
  const funnel = Object.fromEntries(representativeFunnel().map((f) => [f.stage, f.count]));
  const sources = representativeSources();
  assert.equal(
    sources.reduce((n, s) => n + s.submitted, 0),
    funnel['Submitted'],
  );
  assert.equal(
    sources.reduce((n, s) => n + s.started, 0),
    funnel['Started'],
  );
  assert.doesNotThrow(() => agentRows(representativeAgents()));
});

test('toCsv quotes, doubles quotes, and neutralises spreadsheet formulas', () => {
  assert.equal(
    toCsv(
      ['Source', 'Note'],
      [
        ['Referral', 'bonuses, paid'],
        ['Say "hi"', null],
        ['=HYPERLINK("x")', -5],
      ],
    ),
    'Source,Note\r\nReferral,"bonuses, paid"\r\n"Say ""hi""",\r\n"\'=HYPERLINK(""x"")",\'-5\r\n',
  );
  assert.equal(formatShare(0.456), '46%');
  assert.equal(formatShare(null), '–');
  assert.equal(formatDollars(1400), '$1,400');
  assert.equal(formatDollars(null), '–');
});
