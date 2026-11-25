import type { Placement } from './placements';

/**
 * Representative placements until the back-office sync exists. Names, clients and rates are
 * fictional. Dates are offsets from the firm-local `today` (YYYY-MM-DD).
 */
export function representativePlacements(today: string): Placement[] {
  const [y, m, d] = today.split('-').map(Number);
  const day = (offset: number) =>
    new Date(Date.UTC(y!, m! - 1, d! + offset)).toISOString().slice(0, 10);
  return [
    {
      id: 'lena',
      contractor: 'Lena M.',
      client: 'Woodgrove Bank',
      role: 'Data Analyst',
      start: day(-630),
      end: day(21),
      bill: 82,
      pay: 64,
      extension: 'none',
    },
    {
      id: 'sam',
      contractor: 'Sam O.',
      client: 'Northwind Health',
      role: 'QA Analyst',
      start: day(-320),
      end: day(36),
      bill: 74,
      pay: 58,
      extension: 'asked',
    },
    {
      id: 'wei',
      contractor: 'Ana V.',
      client: 'Fabrikam Insurance',
      role: 'Java Developer',
      start: day(-90),
      end: day(275),
      bill: 90,
      pay: 76,
      extension: 'none',
    },
    {
      id: 'ravi',
      contractor: 'Omar H.',
      client: 'Adatum Energy',
      role: 'DevOps Engineer',
      start: day(-490),
      end: day(56),
      bill: 96,
      pay: 75,
      extension: 'agreed',
    },
    {
      id: 'jordan',
      contractor: 'Jordan E.',
      client: 'Contoso Retail',
      role: 'Data Engineer',
      start: day(13),
      end: day(286),
      bill: 88,
      pay: 70,
      extension: 'none',
    },
    {
      id: 'mei',
      contractor: 'Mei C.',
      client: 'Northwind Health',
      role: 'Business Analyst',
      start: day(-296),
      end: day(68),
      bill: 78,
      pay: 61,
      extension: 'none',
    },
    {
      id: 'kofi',
      contractor: 'Kofi A.',
      client: 'Contoso Retail',
      role: 'Scrum Master',
      start: day(-400),
      end: day(-12),
      bill: 80,
      pay: 63,
      extension: 'declined',
    },
  ];
}
