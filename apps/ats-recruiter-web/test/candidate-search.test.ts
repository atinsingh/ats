import { test } from 'node:test';
import assert from 'node:assert/strict';

import { searchCandidates } from '../src/lib/candidates/search.ts';

const people = [
  {
    id: '1',
    fullName: 'Priya Natarajan',
    email: 'priya@example.com',
    headline: 'Senior Java Developer',
  },
  {
    id: '2',
    fullName: 'José Álvarez',
    email: 'jose@example.com',
    headline: 'Data Engineer, Airflow',
  },
  { id: '3', fullName: 'Tom Baker', email: 'tbaker@example.com', headline: null },
];

test('empty query returns everyone sorted by name', () => {
  assert.deepEqual(
    searchCandidates(people, '  ').map((p) => p.id),
    ['2', '1', '3'],
  );
});

test('matches name, headline or email, ignoring case and accents', () => {
  assert.deepEqual(
    searchCandidates(people, 'jose').map((p) => p.id),
    ['2'],
  );
  assert.deepEqual(
    searchCandidates(people, 'ÁLVAREZ').map((p) => p.id),
    ['2'],
  );
  assert.deepEqual(
    searchCandidates(people, 'java').map((p) => p.id),
    ['1'],
  );
  assert.deepEqual(
    searchCandidates(people, 'tbaker@').map((p) => p.id),
    ['3'],
  );
});

test('every word must match somewhere', () => {
  assert.deepEqual(
    searchCandidates(people, 'data airflow').map((p) => p.id),
    ['2'],
  );
  assert.deepEqual(
    searchCandidates(people, 'data java').map((p) => p.id),
    [],
  );
});

test('name matches rank before headline or email matches', () => {
  const list = [
    { id: 'a', fullName: 'Ana Reyes', email: 'a@x.com', headline: 'Works with Tom' },
    { id: 'b', fullName: 'Tom Lee', email: 'b@x.com', headline: null },
  ];
  assert.deepEqual(
    searchCandidates(list, 'tom').map((p) => p.id),
    ['b', 'a'],
  );
});
