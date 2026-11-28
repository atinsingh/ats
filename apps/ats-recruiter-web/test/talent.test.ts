import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addToShortlist,
  buildString,
  cleanTerms,
  orGroup,
  partsProblem,
  sortMatches,
  splitTerms,
  type SearchParts,
} from '../src/lib/talent/talent.ts';
import { representativeTalentJobs } from '../src/lib/talent/representative.ts';

const parts = representativeTalentJobs()[0]!.parts;

test('terms are cleaned, quoted when they have spaces, and grouped with OR', () => {
  assert.deepEqual(cleanTerms(['  Kafka ', 'kafka', '"spring  boot', '']), [
    'Kafka',
    'spring boot',
  ]);
  assert.deepEqual(splitTerms('java, "java engineer" , ,Java'), ['java', 'java engineer']);
  assert.equal(orGroup(['kafka']), 'kafka');
  assert.equal(orGroup(['spring boot', 'springboot']), '("spring boot" OR springboot)');
  assert.equal(orGroup([]), '');
});

test('each source gets its own syntax from the same parts', () => {
  assert.equal(
    buildString(parts, 'db'),
    '(title:("java developer" OR "java engineer" OR "backend engineer") AND skill:("spring boot" OR springboot) AND skill:kafka)\n' +
      'AND location:within(50km, "Mississauga, ON") AND available:<=2026-12-31 AND NOT keyword:(intern OR student OR "principal architect")\n' +
      'NOT status:(placed_active OR do_not_contact)',
  );
  assert.equal(
    buildString(parts, 'linkedin'),
    '("java developer" OR "java engineer" OR "backend engineer") AND ("spring boot" OR springboot) AND kafka NOT (intern OR student OR "principal architect")',
  );
  assert.equal(
    buildString(parts, 'xray'),
    'site:linkedin.com/in ("java developer" OR "java engineer" OR "backend engineer") ("spring boot" OR springboot) kafka ("Mississauga, ON" OR "Toronto, ON") -intern -student -"principal architect" -intitle:jobs -recruiter',
  );
  assert.match(buildString(parts, 'indeed'), /^title:\("java developer"/);
  assert.match(buildString(parts, 'dice'), /AND \("Mississauga, ON" OR "Toronto, ON"\)$/);
});

test('the database string always leaves out people placed now and do-not-contact', () => {
  const bare: SearchParts = {
    titles: [],
    skills: [['kafka']],
    exclude: [],
    locations: [],
    radiusKm: 50,
  };
  assert.equal(
    buildString(bare, 'db'),
    '(skill:kafka)\nNOT status:(placed_active OR do_not_contact)',
  );
  const single: SearchParts = { ...bare, titles: ['sdet'] };
  assert.match(buildString(single, 'db'), /^\(title:\(sdet\) AND skill:kafka\)/);
  assert.equal(partsProblem({ ...bare, skills: [[' ']] }), 'Add at least one title or skill.');
  assert.equal(partsProblem(parts), null);
});

test('matches sort by must-haves found, then soonest available', () => {
  const sorted = sortMatches(representativeTalentJobs()[0]!.matches);
  assert.deepEqual(
    sorted.map((m) => m.name),
    ['Wei L.', 'Amara K.', 'Daniel O.', 'Sofia R.', 'Tom B.'],
  );
  assert.deepEqual(addToShortlist(['m1'], ['m2', 'm1']), ['m1', 'm2']);
});
