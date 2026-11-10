/**
 * Resolves portal-side tenant + service URLs from env. Server-only —
 * import only from server components, route handlers, or server actions.
 *
 * Production should swap the env-based tenant for a JWT/session-derived
 * value; the demo build relies on `PORTAL_SEARCH_TENANT_ID` so localhost
 * works without an auth provider wired up.
 */
export type PortalServerConfig = {
  searchGatewayUrl: string | null;
  candidateServiceUrl: string | null;
  jobServiceUrl: string | null;
  applicationServiceUrl: string | null;
  tenantId: string;
  candidateUserId: string;
};

const DEMO_TENANT = '11111111-1111-1111-1111-111111111111';
const DEMO_CANDIDATE = '22222222-2222-2222-2222-222222222301';

export function readPortalServerConfig(): PortalServerConfig {
  return {
    searchGatewayUrl: nullIfEmpty(process.env.SEARCH_GATEWAY_URL),
    candidateServiceUrl: nullIfEmpty(
      process.env.NEXT_PUBLIC_CANDIDATE_SERVICE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
    ),
    jobServiceUrl: nullIfEmpty(
      process.env.NEXT_PUBLIC_JOB_SERVICE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
    ),
    applicationServiceUrl: nullIfEmpty(
      process.env.NEXT_PUBLIC_APPLICATION_SERVICE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
    ),
    tenantId: process.env.PORTAL_SEARCH_TENANT_ID ?? DEMO_TENANT,
    candidateUserId: process.env.PORTAL_DEMO_CANDIDATE_ID ?? DEMO_CANDIDATE,
  };
}

function nullIfEmpty(v: string | undefined): string | null {
  if (!v) return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed.replace(/\/$/, '');
}
