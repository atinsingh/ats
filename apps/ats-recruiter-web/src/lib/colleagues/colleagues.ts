import type { Colleague } from '@jobocate/api-sdk';

/** "Priya Shah", or the part of the email before the @ when there is no display name. */
export function colleagueName(c: Pick<Colleague, 'displayName' | 'email'>): string {
  return c.displayName?.trim() || c.email.split('@')[0] || 'Teammate';
}
