import {
  JobocateHttpError,
  createJobocateClient,
  type CandidateProfile,
} from '@jobocate/api-sdk';
import { readPortalServerConfig } from '../../../lib/portal-config';
import {
  ConfigMissingNotice,
  EmptyState,
  ErrorBanner,
} from '../../../components/portal/ConfigMissingNotice';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const cfg = readPortalServerConfig();
  if (!cfg.candidateServiceUrl) {
    return (
      <ConfigMissingNotice
        envName="NEXT_PUBLIC_CANDIDATE_SERVICE_URL"
        example="http://localhost:8083"
      />
    );
  }

  const client = createJobocateClient({
    baseUrl: cfg.candidateServiceUrl,
    getTenantId: () => cfg.tenantId,
  });

  let profile: CandidateProfile | null = null;
  let error: string | null = null;
  try {
    profile = await client.candidate.me();
  } catch (e) {
    if (e instanceof JobocateHttpError && e.status === 404) {
      // Empty profile is a valid state for a new candidate.
      profile = null;
    } else {
      error = e instanceof Error ? e.message : 'Failed to load profile';
    }
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  if (!profile) {
    return (
      <EmptyState
        title="Let's create your profile"
        hint="Add a few details so recruiters can match you with the right roles."
      />
    );
  }

  return (
    <section aria-label="Candidate profile" className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Profile</p>
            <h2 className="mt-1 text-xl font-semibold">{profile.fullName || 'Unnamed candidate'}</h2>
            <p className="text-sm text-jobocate-muted">{profile.email}</p>
          </div>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-jobocate-coral">
            {profile.visibility.replace('_', ' ').toLowerCase()}
          </span>
        </div>
        {profile.headline ? (
          <p className="mt-4 text-base">{profile.headline}</p>
        ) : null}
        {profile.summary ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{profile.summary}</p>
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card title="Location">
          <KeyValue label="City" value={profile.locationCity} />
          <KeyValue label="Region" value={profile.locationRegion} />
          <KeyValue label="Country" value={profile.locationCountry} />
        </Card>

        <Card title="Compensation expectation">
          <KeyValue
            label="Range"
            value={
              profile.salaryExpectationMinCents != null && profile.salaryExpectationMaxCents != null
                ? `${formatMoney(profile.salaryExpectationMinCents)} – ${formatMoney(
                    profile.salaryExpectationMaxCents,
                  )} ${profile.currencyCode ?? ''}`
                : null
            }
          />
          <KeyValue label="Availability" value={profile.availability} />
        </Card>

        <Card title="Skills">
          {profile.skills && profile.skills.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <li
                  key={s}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-jobocate-muted">No skills listed yet.</p>
          )}
        </Card>

        <Card title="Consent">
          <KeyValue
            label="Visible in recruiter database"
            value={profile.consentSearchable ? 'Yes' : 'No'}
          />
          <KeyValue
            label="Resume shareable on apply"
            value={profile.consentResumeShared ? 'Yes' : 'No'}
          />
        </Card>
      </div>

      <p className="text-xs text-jobocate-muted">
        Editing the profile is wired in the candidate-service. The PATCH endpoint accepts the
        same fields shown above.
      </p>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="mt-3 space-y-2 text-sm text-slate-700">{children}</div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-jobocate-muted">{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  );
}

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
}
