import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { ALLOWED_NEXT } from '../src/lib/candidates/transitions.ts';

/** Parses the backend's transition table so the two cannot drift apart unnoticed. */
function backendTable(): Record<string, string[]> {
  const src = readFileSync(
    new URL(
      '../../../services-java/application-service/src/main/java/com/jobocate/application/domain/ApplicationStatusTransitions.java',
      import.meta.url,
    ),
    'utf8',
  );
  const table: Record<string, string[]> = {};
  const entry = /ApplicationStatus\.(\w+),\s*EnumSet\.(?:of\(([^)]*)\)|noneOf)/g;
  for (const m of src.matchAll(entry)) {
    table[m[1]!] = [...(m[2] ?? '').matchAll(/ApplicationStatus\.(\w+)/g)].map((x) => x[1]!);
  }
  return table;
}

const SYSTEM_OR_CANDIDATE = new Set(['WITHDRAWN', 'EXPIRED']);

test('every move the recruiter app offers is allowed by application-service', () => {
  const backend = backendTable();
  assert.ok(Object.keys(backend).length >= 10, 'parsed the backend table');
  for (const [from, nexts] of Object.entries(ALLOWED_NEXT)) {
    for (const to of nexts) {
      assert.ok(backend[from]?.includes(to), `${from} -> ${to} is not allowed by the backend`);
    }
  }
});

test('the recruiter app offers every backend move except withdraw and expire', () => {
  const backend = backendTable();
  for (const [from, nexts] of Object.entries(backend)) {
    if (from === 'DRAFT') continue; // Drafts belong to the candidate.
    const expected = nexts.filter((n) => !SYSTEM_OR_CANDIDATE.has(n)).sort();
    assert.deepEqual([...(ALLOWED_NEXT[from] ?? [])].sort(), expected, from);
  }
});
