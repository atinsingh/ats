import assert from 'node:assert/strict';
import { test } from 'node:test';

import { jobLabel, jobToParts, toMatch } from '../src/lib/talent/live.ts';

const match = (availability: string | null) => ({
  id: 'p1',
  fullName: 'Sample Person',
  headline: 'Senior Java Developer',
  availability,
  found: 2,
  of: 3,
  updatedAt: '2026-11-20T00:00:00Z',
});

test("a job's title, skills and place become its must-haves", () => {
  const parts = jobToParts({
    title: 'Senior Java Developer',
    skills: ['Spring Boot', ' Kafka ', '', 'AWS', 'Docker', 'SQL', 'React', 'Go'],
    locationCity: 'Toronto',
    locationRegion: 'ON',
  });
  assert.deepEqual(parts.titles, ['senior java developer']);
  assert.deepEqual(parts.skills[0], ['spring boot']);
  assert.deepEqual(parts.skills[1], ['kafka']);
  assert.equal(parts.skills.length, 6);
  assert.deepEqual(parts.locations, ['Toronto, ON']);
  assert.equal(
    jobLabel({ title: 'Data Analyst', locationCity: null, location: 'Remote' }),
    'Data Analyst, Remote',
  );
});

test('availability becomes a date or a plain label, and contact stays untracked', () => {
  assert.equal(toMatch(match('IMMEDIATE'), '2026-11-28').available, '');
  assert.equal(toMatch(match('TWO_WEEKS'), '2026-11-28').available, '2026-12-12');
  assert.equal(toMatch(match('PASSIVE'), '2026-11-28').availableLabel, 'Not looking');
  assert.equal(toMatch(match(null), '2026-11-28').availableLabel, 'Not stated');
  const m = toMatch(match('IMMEDIATE'), '2026-11-28');
  assert.equal(m.lastContact, null);
  assert.deepEqual(m.consent, []);
  assert.equal(m.name, 'Sample Person');
});
