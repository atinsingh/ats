import type { Client } from './clients';

/**
 * Representative clients until a client service exists. Names and figures are fictional. Dates
 * are relative to now so the attention flags always have something to show.
 */
export function representativeClients(now: Date = new Date()): Client[] {
  const days = (d: number) => new Date(now.getTime() + d * 86_400_000).toISOString();
  return [
    {
      id: 'northwind',
      name: 'Northwind Health',
      status: 'active',
      openJobs: 4,
      revenue12m: 1_420_000,
      channel: 'Beeline',
      owner: 'You',
      lastContactAt: days(0),
    },
    {
      id: 'fabrikam',
      name: 'Fabrikam Insurance',
      status: 'active',
      openJobs: 6,
      revenue12m: 2_100_000,
      channel: 'SAP Fieldglass',
      owner: 'Ben C.',
      lastContactAt: days(-1),
    },
    {
      id: 'contoso',
      name: 'Contoso Retail',
      status: 'active',
      openJobs: 3,
      revenue12m: 880_000,
      channel: 'Direct',
      owner: 'You',
      lastContactAt: days(-4),
    },
    {
      id: 'adatum',
      name: 'Adatum Energy',
      status: 'active',
      openJobs: 2,
      revenue12m: 610_000,
      channel: 'Direct',
      owner: 'Carmen D.',
      lastContactAt: days(-19),
    },
    {
      id: 'litware',
      name: 'Litware Software',
      status: 'active',
      openJobs: 1,
      revenue12m: 340_000,
      channel: 'Direct',
      owner: 'You',
      lastContactAt: days(-13),
      msaEndsAt: days(24),
    },
    {
      id: 'tailspin',
      name: 'Tailspin Logistics',
      status: 'prospect',
      openJobs: 0,
      revenue12m: 0,
      channel: 'Direct',
      owner: 'You',
      lastContactAt: days(-5),
    },
    {
      id: 'woodgrove',
      name: 'Woodgrove Bank',
      status: 'dormant',
      openJobs: 0,
      revenue12m: 0,
      channel: 'VNDLY',
      owner: 'Unassigned',
      lastContactAt: days(-266),
    },
  ];
}
