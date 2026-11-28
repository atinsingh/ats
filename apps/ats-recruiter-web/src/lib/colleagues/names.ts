import type { RecruiterConfig } from '../recruiter-config';
import { recruiterClient } from '../submittals/names';
import { colleagueName } from './colleagues';

/**
 * Colleague names by user id, from tenant-auth-service. Empty when it can't be reached, so callers
 * fall back to "Teammate".
 */
export async function loadColleagueNames(cfg: RecruiterConfig): Promise<Map<string, string>> {
  if (!cfg.authServiceUrl) return new Map();
  try {
    const rows = await recruiterClient(cfg, cfg.authServiceUrl).colleagues.list();
    return new Map(rows.map((c) => [c.id, colleagueName(c)]));
  } catch {
    return new Map();
  }
}
