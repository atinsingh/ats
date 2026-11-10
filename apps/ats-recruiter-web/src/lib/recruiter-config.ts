/**
 * Server-only env-derived config for the recruiter web app. Keeps a single
 * tenant id for local demos; production should resolve tenant from the
 * authenticated session.
 */
export type RecruiterConfig = {
  jobServiceUrl: string | null;
  applicationServiceUrl: string | null;
  candidateServiceUrl: string | null;
  searchGatewayUrl: string | null;
  tenantId: string;
  recruiterUserId: string;
};

const DEMO_TENANT = '11111111-1111-1111-1111-111111111111';
const DEMO_RECRUITER = '33333333-3333-3333-3333-333333333301';

export function readRecruiterConfig(): RecruiterConfig {
  return {
    jobServiceUrl: nullIfEmpty(
      process.env.NEXT_PUBLIC_JOB_SERVICE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
    ),
    applicationServiceUrl: nullIfEmpty(
      process.env.NEXT_PUBLIC_APPLICATION_SERVICE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
    ),
    candidateServiceUrl: nullIfEmpty(
      process.env.NEXT_PUBLIC_CANDIDATE_SERVICE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
    ),
    searchGatewayUrl: nullIfEmpty(process.env.SEARCH_GATEWAY_URL),
    tenantId: process.env.RECRUITER_TENANT_ID ?? DEMO_TENANT,
    recruiterUserId: process.env.RECRUITER_DEMO_USER_ID ?? DEMO_RECRUITER,
  };
}

function nullIfEmpty(v: string | undefined): string | null {
  if (!v) return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed.replace(/\/$/, '');
}
