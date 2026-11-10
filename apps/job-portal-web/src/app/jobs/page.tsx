import Link from 'next/link';
import {
  JobocateHttpError,
  searchJobsGet,
  type JobSearchGetParams,
  type JobSearchResponse,
} from '@jobocate/api-sdk';
import { readPortalServerConfig } from '../../lib/portal-config';
import {
  ConfigMissingNotice,
  ErrorBanner,
} from '../../components/portal/ConfigMissingNotice';

type SearchParams = {
  q?: string;
  employment_type?: string;
  remote_policy?: string;
  country?: string;
  city?: string;
  skills?: string;
  salary_min_cents?: string;
  page?: string;
  size?: string;
  sort?: string;
};

export const dynamic = 'force-dynamic';

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const cfg = readPortalServerConfig();

  if (!cfg.searchGatewayUrl) {
    return (
      <Shell>
        <ConfigMissingNotice envName="SEARCH_GATEWAY_URL" example="http://localhost:7070" />
      </Shell>
    );
  }

  const params = toSearchParams(sp);
  let data: JobSearchResponse | null = null;
  let error: string | null = null;
  try {
    data = await searchJobsGet(
      { baseUrl: cfg.searchGatewayUrl, tenantId: cfg.tenantId },
      params,
    );
  } catch (e) {
    if (e instanceof JobocateHttpError) {
      error = `Search failed (${e.status})`;
    } else {
      error = e instanceof Error ? e.message : 'Search failed';
    }
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Open roles</h1>
      <p className="mt-2 max-w-2xl text-sm text-jobocate-muted sm:text-base">
        Tenant search backed by OpenSearch. Tenant id is supplied by the portal session
        (or <code>PORTAL_SEARCH_TENANT_ID</code> in dev).
      </p>

      <FilterForm sp={sp} />

      {error ? <div className="mt-6"><ErrorBanner message={error} /></div> : null}

      {data && !error ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[16rem_1fr]">
          <FacetSidebar data={data} sp={sp} />
          <ResultList data={data} sp={sp} />
        </div>
      ) : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-landing-gradient text-jobocate-ink">
      <header className="border-b border-rose-100/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-jobocate-coral">
            JOBOCATE
          </Link>
          <nav className="flex gap-4 text-sm font-medium text-slate-700">
            <Link href="/jobs" className="text-jobocate-coral">Browse jobs</Link>
            <Link href="/candidate/applications" className="hover:text-jobocate-coral">
              My applications
            </Link>
            <Link href="/" className="hover:text-jobocate-coral">Home</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

function FilterForm({ sp }: { sp: SearchParams }) {
  return (
    <form
      className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      action="/jobs"
      method="get"
    >
      <Field id="q" label="Keywords" defaultValue={sp.q} placeholder="engineer, designer…" />
      <Select
        id="employment_type"
        label="Employment type"
        defaultValue={sp.employment_type}
        options={[
          ['', 'Any'],
          ['FULL_TIME', 'Full time'],
          ['PART_TIME', 'Part time'],
          ['CONTRACT', 'Contract'],
          ['INTERNSHIP', 'Internship'],
          ['TEMPORARY', 'Temporary'],
        ]}
      />
      <Select
        id="remote_policy"
        label="Remote"
        defaultValue={sp.remote_policy}
        options={[
          ['', 'Any'],
          ['REMOTE_FIRST', 'Remote first'],
          ['HYBRID', 'Hybrid'],
          ['ONSITE', 'Onsite'],
        ]}
      />
      <Field id="country" label="Country (ISO)" defaultValue={sp.country} placeholder="US" />
      <Field id="city" label="City" defaultValue={sp.city} placeholder="San Francisco" />
      <Field id="skills" label="Skills (comma-sep)" defaultValue={sp.skills} placeholder="java,go" />
      <Field
        id="salary_min_cents"
        label="Min salary (cents)"
        defaultValue={sp.salary_min_cents}
        placeholder="10000000"
        inputMode="numeric"
      />
      <div className="flex items-end gap-2">
        <Select
          id="sort"
          label="Sort"
          defaultValue={sp.sort}
          options={[
            ['', 'Relevance'],
            ['recency', 'Most recent'],
            ['salary_desc', 'Salary (high → low)'],
            ['salary_asc', 'Salary (low → high)'],
          ]}
        />
        <button
          type="submit"
          className="h-[42px] rounded-full bg-jobocate-coral px-6 text-sm font-semibold text-white shadow-sm hover:bg-jobocate-coralHover"
        >
          Search
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  defaultValue,
  placeholder,
  inputMode,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  inputMode?: 'numeric' | 'text';
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      <input
        id={id}
        name={id}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        inputMode={inputMode}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-jobocate-coral focus:ring-2"
      />
    </div>
  );
}

function Select({
  id,
  label,
  defaultValue,
  options,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  options: [value: string, label: string][];
}) {
  return (
    <div className="flex w-full flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      <select
        id={id}
        name={id}
        defaultValue={defaultValue ?? ''}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-jobocate-coral focus:ring-2"
      >
        {options.map(([v, l]) => (
          <option key={`${id}-${v}`} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );
}

function FacetSidebar({ data, sp }: { data: JobSearchResponse; sp: SearchParams }) {
  return (
    <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-800">Filters</h2>
      <FacetGroup title="Country" buckets={data.facets.country ?? []} param="country" sp={sp} />
      <FacetGroup title="City" buckets={data.facets.city ?? []} param="city" sp={sp} />
      <FacetGroup
        title="Employment type"
        buckets={data.facets.employment_type ?? []}
        param="employment_type"
        sp={sp}
      />
      <FacetGroup
        title="Remote"
        buckets={data.facets.remote_policy ?? []}
        param="remote_policy"
        sp={sp}
      />
      <FacetGroup title="Skills" buckets={data.facets.skills ?? []} param="skills" sp={sp} />
    </aside>
  );
}

function FacetGroup({
  title,
  buckets,
  param,
  sp,
}: {
  title: string;
  buckets: { value: string; count: number }[];
  param: keyof SearchParams;
  sp: SearchParams;
}) {
  if (!buckets.length) {
    return (
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</h3>
        <p className="mt-1 text-xs text-jobocate-muted">No values yet.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</h3>
      <ul className="mt-2 space-y-1">
        {buckets.slice(0, 10).map((b) => {
          const next = { ...sp, [param]: b.value };
          delete next.page;
          const qs = new URLSearchParams(
            Object.entries(next).filter(([, v]) => v != null && v !== '') as [string, string][],
          );
          return (
            <li key={`${title}-${b.value}`} className="flex justify-between text-sm">
              <Link
                href={`/jobs?${qs.toString()}`}
                className="truncate text-jobocate-coral hover:underline"
              >
                {b.value || '(empty)'}
              </Link>
              <span className="text-slate-500">{b.count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ResultList({ data, sp }: { data: JobSearchResponse; sp: SearchParams }) {
  return (
    <section aria-label="Search results">
      <p className="text-sm text-jobocate-muted">
        {data.total.value}{data.total.relation === 'gte' ? '+' : ''} matching roles
        {data.page && data.size ? ` · page ${data.page}` : ''}
      </p>
      <ul className="mt-4 flex flex-col gap-3" role="list">
        {data.hits.length === 0 ? (
          <li className="rounded-xl border border-slate-200 bg-white/90 p-6 text-center text-slate-600">
            No roles match. Try different keywords or relax filters.
          </li>
        ) : (
          data.hits.map((hit) => {
            const doc = hit.document;
            const title = String(doc.title ?? 'Untitled');
            const id = String(doc.job_id ?? hit.id);
            const company = doc.company_name ? String(doc.company_name) : '';
            const loc = doc.location ? String(doc.location) : composeLocation(doc);
            const et = doc.employment_type ? String(doc.employment_type) : '';
            const rp = doc.remote_policy ? String(doc.remote_policy) : '';
            return (
              <li key={id}>
                <Link
                  href={`/jobs/${id}`}
                  className="block rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:border-jobocate-coral/40 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-slate-900">{title}</span>
                    {company ? <span className="text-xs text-jobocate-muted">{company}</span> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600 sm:text-sm">
                    {loc ? <span>{loc}</span> : null}
                    {et ? <span className="rounded-full bg-rose-50 px-2 py-0.5">{et}</span> : null}
                    {rp ? <span className="rounded-full bg-slate-100 px-2 py-0.5">{rp}</span> : null}
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
      <Pagination data={data} sp={sp} />
    </section>
  );
}

function Pagination({ data, sp }: { data: JobSearchResponse; sp: SearchParams }) {
  const page = data.page ?? 1;
  const size = data.size ?? 25;
  const hasPrev = page > 1;
  const hasNext = data.hits.length === size;
  if (!hasPrev && !hasNext) return null;

  function withPage(p: number) {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(sp)) {
      if (v != null && v !== '') next[k] = v;
    }
    next.page = String(p);
    return `/jobs?${new URLSearchParams(next).toString()}`;
  }

  return (
    <nav className="mt-6 flex justify-between gap-2 text-sm" aria-label="Results pagination">
      {hasPrev ? (
        <Link href={withPage(page - 1)} className="text-jobocate-coral hover:underline">
          ← Previous
        </Link>
      ) : <span />}
      <span className="text-jobocate-muted">Page {page}</span>
      {hasNext ? (
        <Link href={withPage(page + 1)} className="text-jobocate-coral hover:underline">
          Next →
        </Link>
      ) : <span />}
    </nav>
  );
}

function composeLocation(doc: Record<string, unknown>): string {
  const parts = [doc.city, doc.region, doc.country].filter(
    (v) => typeof v === 'string' && v.length > 0,
  );
  return parts.join(', ');
}

function toSearchParams(sp: SearchParams): JobSearchGetParams {
  const out: JobSearchGetParams = {};
  if (sp.q) out.q = sp.q;
  if (sp.employment_type) out.employment_type = sp.employment_type;
  if (sp.remote_policy) out.remote_policy = sp.remote_policy;
  if (sp.country) out.country = sp.country;
  if (sp.city) out.city = sp.city;
  if (sp.skills) out.skills = sp.skills.split(',').map((s) => s.trim()).filter(Boolean);
  if (sp.salary_min_cents) {
    const n = Number(sp.salary_min_cents);
    if (Number.isFinite(n) && n >= 0) out.salary_min_cents = n;
  }
  if (sp.page) {
    const n = Number(sp.page);
    if (Number.isFinite(n) && n >= 1) out.page = n;
  }
  if (sp.size) {
    const n = Number(sp.size);
    if (Number.isFinite(n) && n >= 1) out.size = n;
  }
  if (sp.sort && ['relevance', 'recency', 'salary_asc', 'salary_desc'].includes(sp.sort)) {
    out.sort = sp.sort as JobSearchGetParams['sort'];
  }
  return out;
}
