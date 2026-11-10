export type JobocateClientOptions = {
  baseUrl: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  /** When set, sends `X-Jobocate-Tenant-Id` (local dev; production should use JWT-only paths). */
  getTenantId?: () => string | undefined | Promise<string | undefined>;
  /** When set, sends `X-Jobocate-Candidate-Id` (local dev shim until JWT-derived identity lands). */
  getCandidateId?: () => string | undefined | Promise<string | undefined>;
};

export type SearchGatewayClientOptions = {
  baseUrl: string;
  tenantId: string;
};

export type JobSearchRequest = {
  query?: string;
  filters?: Record<string, unknown>;
  limit?: number;
};

export type JobSearchGetParams = {
  q?: string;
  country?: string;
  region?: string;
  city?: string;
  location?: string;
  employment_type?: string;
  remote_policy?: string;
  skills?: string[];
  salary_min_cents?: number;
  salary_max_cents?: number;
  experience_min_years?: number;
  experience_max_years?: number;
  page?: number;
  size?: number;
  sort?: 'relevance' | 'recency' | 'salary_asc' | 'salary_desc';
};

export type FacetBucket = { value: string; count: number };

export type JobSearchHit = {
  id: string;
  score: number;
  highlight?: Record<string, string[]>;
  document: Record<string, unknown>;
};

export type JobSearchResponse = {
  total: { value: number; relation: string };
  hits: JobSearchHit[];
  facets: Record<string, FacetBucket[]>;
  page?: number;
  size?: number;
};

export type AutocompleteSuggestion = {
  job_id?: string;
  title?: string;
  company_name?: string;
};

export type CandidateProfile = {
  id: string;
  email: string;
  fullName: string;
  headline?: string | null;
  summary?: string | null;
  locationCity?: string | null;
  locationRegion?: string | null;
  locationCountry?: string | null;
  visibility: 'PRIVATE' | 'TENANT_ONLY' | 'PUBLIC_TO_RECRUITERS';
  availability?: 'ACTIVE_LOOKING' | 'OPEN_TO_OPPORTUNITIES' | 'NOT_LOOKING' | null;
  desiredRoles?: string[];
  skills?: string[];
  salaryExpectationMinCents?: number | null;
  salaryExpectationMaxCents?: number | null;
  currencyCode?: string | null;
  consentSearchable: boolean;
  consentResumeShared: boolean;
  links?: Record<string, string>;
  updatedAt?: string;
};

export type CandidateProfileInput = Partial<
  Pick<
    CandidateProfile,
    | 'fullName'
    | 'headline'
    | 'summary'
    | 'locationCity'
    | 'locationRegion'
    | 'locationCountry'
    | 'visibility'
    | 'availability'
    | 'desiredRoles'
    | 'skills'
    | 'salaryExpectationMinCents'
    | 'salaryExpectationMaxCents'
    | 'currencyCode'
    | 'consentSearchable'
    | 'consentResumeShared'
    | 'links'
  >
>;

export type ResumeParserStatus = 'PENDING' | 'IN_PROGRESS' | 'PARSED' | 'FAILED';

export type Resume = {
  id: string;
  candidateProfileId?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Backend `IN_PROGRESS` is exposed as-is; older `COMPLETED` aliases to `PARSED`. */
  parserStatus: ResumeParserStatus;
  uploadedAt: string;
  parsedAt?: string | null;
  parserError?: string | null;
  isPrimary?: boolean;
  isDefault?: boolean;
  versionLabel?: string | null;
};

export type ResumeUploadUrl = {
  resumeId: string;
  uploadUrl: string;
  s3Key: string;
  expiresAt: string;
};

export type ResumeParsedFields = {
  resumeId: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  locationCity?: string | null;
  locationRegion?: string | null;
  locationCountry?: string | null;
  skills?: string[];
  totalExperienceYears?: number | null;
  parserVersion?: string | null;
  parsedAt?: string | null;
  reviewStatus: 'PENDING' | 'PROPOSED' | 'APPLIED' | 'REJECTED';
};

export type ApplicationSummary = {
  id: string;
  jobId: string;
  jobTitle?: string;
  companyName?: string;
  status: string;
  appliedAt: string;
  updatedAt?: string;
};

export type SavedJob = {
  id: string;
  jobId: string;
  jobTitle?: string;
  companyName?: string;
  savedAt: string;
};

export type Job = {
  id: string;
  tenantId: string;
  slug?: string | null;
  title: string;
  department?: string | null;
  description?: string | null;
  responsibilities?: string | null;
  qualifications?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  employmentType?: string | null;
  remotePolicy?: string | null;
  experienceMinYears?: number | null;
  experienceMaxYears?: number | null;
  salaryMinCents?: number | null;
  salaryMaxCents?: number | null;
  currencyCode?: string | null;
  location?: string | null;
  locationCity?: string | null;
  locationRegion?: string | null;
  locationCountry?: string | null;
  publishedAt?: string | null;
  closedAt?: string | null;
  pipelineId?: string | null;
  organizationId?: string | null;
  skills?: string[];
};

export type CreateJobInput = {
  title: string;
  department?: string;
  description?: string;
  responsibilities?: string;
  qualifications?: string;
  employmentType?: string;
  remotePolicy?: string;
  experienceMinYears?: number;
  experienceMaxYears?: number;
  salaryMinCents?: number;
  salaryMaxCents?: number;
  currencyCode?: string;
  location?: string;
  locationCity?: string;
  locationRegion?: string;
  locationCountry?: string;
  organizationId?: string;
  pipelineId?: string;
  skills?: string[];
};

export type ApplicationDetail = ApplicationSummary & {
  candidateProfileId: string;
  resumeIdUsed?: string | null;
  coverLetterText?: string | null;
  rejectionReason?: string | null;
  withdrawalReason?: string | null;
  source?: string | null;
};

export type AiArtifactKind =
  | 'RESUME_VARIANT'
  | 'COVER_LETTER'
  | 'CANDIDATE_SUMMARY'
  | 'MATCH_EXPLANATION'
  | 'INTERVIEW_QA'
  | 'REJECTION_EMAIL'
  | 'SCREENING_QUESTIONS'
  | 'SHORTLIST_RECOMMENDATION';

export type AiArtifactStatus =
  | 'DRAFT'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'FAILED'
  | 'ARCHIVED';

export type AiArtifactSubjectType =
  | 'CANDIDATE_PROFILE'
  | 'APPLICATION'
  | 'JOB'
  | 'RESUME'
  | 'INTERVIEW';

export type AiArtifact = {
  id: string;
  tenantId?: string;
  kind: AiArtifactKind;
  subjectEntityType: AiArtifactSubjectType;
  subjectEntityId: string;
  relatedApplicationId?: string | null;
  relatedJobId?: string | null;
  relatedResumeId?: string | null;
  promptVersion: string;
  modelVersion: string;
  status: AiArtifactStatus;
  reviewRequired: boolean;
  requestedByUserId?: string | null;
  approvedByUserId?: string | null;
  rejectedByUserId?: string | null;
  rejectionReason?: string | null;
  failureReason?: string | null;
  outputText?: string | null;
  outputS3Key?: string | null;
  createdAt: string;
  readyAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
};

export type RequestAiArtifactInput = {
  kind: AiArtifactKind;
  subjectEntityType: AiArtifactSubjectType;
  subjectEntityId: string;
  relatedApplicationId?: string;
  relatedJobId?: string;
  relatedResumeId?: string;
  promptVersion?: string;
  modelVersion?: string;
  reviewRequired?: boolean;
  inputs?: Record<string, unknown>;
  idempotencyKey?: string;
};

export type TimelineEntry = {
  id: string;
  applicationId: string;
  entryType: string;
  fromValue?: string | null;
  toValue?: string | null;
  summary?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  createdAt: string;
};

export class JobocateHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = 'JobocateHttpError';
  }
}

export function createJobocateClient(options: JobocateClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, '');

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    if (!headers.has('Content-Type') && init?.body) {
      headers.set('Content-Type', 'application/json');
    }
    const token = await options.getAccessToken?.();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const tenantId = await options.getTenantId?.();
    if (tenantId) {
      headers.set('X-Jobocate-Tenant-Id', tenantId);
    }
    const candidateId = await options.getCandidateId?.();
    if (candidateId) {
      headers.set('X-Jobocate-Candidate-Id', candidateId);
    }

    const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
    const text = await res.text();
    if (!res.ok) {
      throw new JobocateHttpError(`HTTP ${res.status}`, res.status, text);
    }
    return text ? (JSON.parse(text) as T) : (null as T);
  }

  return {
    jobs: {
      listOpen: () => request<Job[]>(`/api/v1/jobs`),
      get: (id: string) => request<Job>(`/api/v1/jobs/${encodeURIComponent(id)}`),
      listForRecruiter: (params?: { status?: Job['status']; limit?: number; offset?: number }) => {
        const qs = new URLSearchParams();
        if (params?.status) qs.set('status', params.status);
        if (params?.limit != null) qs.set('limit', String(params.limit));
        if (params?.offset != null) qs.set('offset', String(params.offset));
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return request<Job[]>(`/api/v1/jobs${suffix}`);
      },
      create: (input: CreateJobInput) =>
        request<Job>(`/api/v1/jobs`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      update: (id: string, input: Partial<CreateJobInput>) =>
        request<Job>(`/api/v1/jobs/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
      publish: (id: string) =>
        request<Job>(`/api/v1/jobs/${encodeURIComponent(id)}/publish`, { method: 'POST' }),
      unpublish: (id: string) =>
        request<Job>(`/api/v1/jobs/${encodeURIComponent(id)}/unpublish`, { method: 'POST' }),
      close: (id: string) =>
        request<Job>(`/api/v1/jobs/${encodeURIComponent(id)}/close`, { method: 'POST' }),
      clone: (id: string) =>
        request<Job>(`/api/v1/jobs/${encodeURIComponent(id)}/clone`, { method: 'POST' }),
    },
    tenants: {
      me: () => request<unknown>(`/api/v1/tenants/me`),
    },
    recruiterApplications: {
      listForJob: (jobId: string) =>
        request<ApplicationDetail[]>(
          `/api/v1/jobs/${encodeURIComponent(jobId)}/applications`,
        ),
      get: (id: string) =>
        request<ApplicationDetail>(`/api/v1/applications/${encodeURIComponent(id)}`),
      transition: (
        id: string,
        body: { status: string; rejectionReason?: string },
      ) =>
        request<ApplicationDetail>(
          `/api/v1/applications/${encodeURIComponent(id)}/status`,
          { method: 'POST', body: JSON.stringify(body) },
        ),
      timeline: (id: string) =>
        request<TimelineEntry[]>(
          `/api/v1/applications/${encodeURIComponent(id)}/timeline`,
        ),
    },
    recruiterCandidates: {
      get: (id: string) =>
        request<CandidateProfile>(`/api/v1/candidates/${encodeURIComponent(id)}`),
      resumes: (id: string) =>
        request<Resume[]>(
          `/api/v1/candidates/${encodeURIComponent(id)}/resumes`,
        ),
    },
    candidate: {
      me: () => request<CandidateProfile>(`/api/v1/candidates/me`),
      updateMe: (input: CandidateProfileInput) =>
        request<CandidateProfile>(`/api/v1/candidates/me`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
    },
    resumes: {
      mine: () => request<Resume[]>(`/api/v1/me/resumes`),
      get: (resumeId: string) =>
        request<Resume>(`/api/v1/me/resumes/${encodeURIComponent(resumeId)}`),
      requestUploadUrl: (input: { filename: string; mimeType: string; sizeBytes: number }) =>
        request<ResumeUploadUrl>(`/api/v1/me/resumes/upload-url`, {
          method: 'POST',
          body: JSON.stringify({
            filename: input.filename,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
          }),
        }),
      finalize: (resumeId: string, body?: { versionLabel?: string; setDefault?: boolean }) =>
        request<Resume>(
          `/api/v1/me/resumes/${encodeURIComponent(resumeId)}/finalize`,
          { method: 'POST', body: JSON.stringify(body ?? {}) },
        ),
      parsedFields: (resumeId: string) =>
        request<ResumeParsedFields>(
          `/api/v1/me/resumes/${encodeURIComponent(resumeId)}/parsed-fields`,
        ),
      applyParsedFields: (resumeId: string) =>
        request<{ candidateProfileId: string; appliedAt: string }>(
          `/api/v1/me/resumes/${encodeURIComponent(resumeId)}/parsed-fields/apply`,
          { method: 'POST' },
        ),
      rejectParsedFields: (resumeId: string) =>
        request<void>(
          `/api/v1/me/resumes/${encodeURIComponent(resumeId)}/parsed-fields/reject`,
          { method: 'POST' },
        ),
      downloadUrl: (resumeId: string) =>
        request<{ url: string; expiresAt: string }>(
          `/api/v1/me/resumes/${encodeURIComponent(resumeId)}/download-url`,
        ),
      delete: (resumeId: string) =>
        request<void>(`/api/v1/me/resumes/${encodeURIComponent(resumeId)}`, {
          method: 'DELETE',
        }),
    },
    applications: {
      mine: () => request<ApplicationSummary[]>(`/api/v1/candidates/me/applications`),
      submit: (input: {
        jobId: string;
        resumeId?: string;
        coverLetterText?: string;
        idempotencyKey?: string;
      }) =>
        request<ApplicationSummary>(`/api/v1/applications`, {
          method: 'POST',
          headers: input.idempotencyKey
            ? { 'Idempotency-Key': input.idempotencyKey }
            : undefined,
          body: JSON.stringify({
            jobId: input.jobId,
            resumeIdUsed: input.resumeId,
            coverLetterText: input.coverLetterText,
          }),
        }),
      withdraw: (applicationId: string, reason?: string) =>
        request<ApplicationSummary>(
          `/api/v1/applications/${encodeURIComponent(applicationId)}/withdraw`,
          {
            method: 'POST',
            body: JSON.stringify({ reason }),
          },
        ),
    },
    aiArtifacts: {
      request: (input: RequestAiArtifactInput) => {
        const { idempotencyKey, ...body } = input;
        return request<AiArtifact>(`/api/v1/ai-artifacts`, {
          method: 'POST',
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
          body: JSON.stringify(body),
        });
      },
      get: (id: string) =>
        request<AiArtifact>(`/api/v1/ai-artifacts/${encodeURIComponent(id)}`),
      listForSubject: (
        subjectType: AiArtifactSubjectType,
        subjectId: string,
        limit = 50,
      ) => {
        const qs = new URLSearchParams({
          subject_type: subjectType,
          subject_id: subjectId,
          limit: String(limit),
        });
        return request<AiArtifact[]>(`/api/v1/ai-artifacts?${qs.toString()}`);
      },
      listMine: (userId: string, limit = 50) => {
        const qs = new URLSearchParams({
          mine_for_user: userId,
          limit: String(limit),
        });
        return request<AiArtifact[]>(`/api/v1/ai-artifacts?${qs.toString()}`);
      },
      approve: (id: string) =>
        request<AiArtifact>(`/api/v1/ai-artifacts/${encodeURIComponent(id)}/approve`, {
          method: 'POST',
        }),
      reject: (id: string, reason?: string) =>
        request<AiArtifact>(`/api/v1/ai-artifacts/${encodeURIComponent(id)}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason ?? null }),
        }),
      archive: (id: string) =>
        request<AiArtifact>(`/api/v1/ai-artifacts/${encodeURIComponent(id)}/archive`, {
          method: 'POST',
        }),
    },
    savedJobs: {
      mine: () => request<SavedJob[]>(`/api/v1/candidates/me/saved-jobs`),
      save: (jobId: string) =>
        request<SavedJob>(`/api/v1/candidates/me/saved-jobs`, {
          method: 'POST',
          body: JSON.stringify({ jobId }),
        }),
      remove: (savedId: string) =>
        request<void>(
          `/api/v1/candidates/me/saved-jobs/${encodeURIComponent(savedId)}`,
          { method: 'DELETE' },
        ),
    },
  };
}

/** Legacy POST search (free-form filters). Prefer `searchJobsGet`. */
export async function searchJobs(
  options: SearchGatewayClientOptions,
  body: JobSearchRequest,
): Promise<JobSearchResponse> {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const payload = {
    query: body.query ?? '',
    filters: body.filters ?? {},
    limit: body.limit ?? 25,
  };
  const res = await fetch(`${baseUrl}/v1/search/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Jobocate-Tenant-Id': options.tenantId,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new JobocateHttpError(`HTTP ${res.status}`, res.status, text);
  }
  return JSON.parse(text) as JobSearchResponse;
}

/** Typed GET search via the search-gateway. Use this from new screens. */
export async function searchJobsGet(
  options: SearchGatewayClientOptions,
  params: JobSearchGetParams,
): Promise<JobSearchResponse> {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const url = new URL(`${baseUrl}/v1/search/jobs`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) url.searchParams.append(key, String(v));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { 'X-Jobocate-Tenant-Id': options.tenantId },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new JobocateHttpError(`HTTP ${res.status}`, res.status, text);
  }
  return JSON.parse(text) as JobSearchResponse;
}

export async function autocompleteJobs(
  options: SearchGatewayClientOptions,
  q: string,
  limit = 10,
): Promise<AutocompleteSuggestion[]> {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const url = new URL(`${baseUrl}/v1/search/jobs/autocomplete`);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url.toString(), {
    headers: { 'X-Jobocate-Tenant-Id': options.tenantId },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new JobocateHttpError(`HTTP ${res.status}`, res.status, text);
  }
  const parsed = JSON.parse(text) as { suggestions?: AutocompleteSuggestion[] };
  return parsed.suggestions ?? [];
}
