export type JobocateClientOptions = {
  baseUrl: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  /** When set, sends `X-Jobocate-Tenant-Id` (local dev; production should use JWT-only paths). */
  getTenantId?: () => string | undefined | Promise<string | undefined>;
  /** When set, sends `X-Jobocate-Candidate-Id` (local dev shim until JWT-derived identity lands). */
  getCandidateId?: () => string | undefined | Promise<string | undefined>;
  /** When set, sends `X-Jobocate-User-Id` so the service records who acted (local dev shim). */
  getUserId?: () => string | undefined | Promise<string | undefined>;
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

/** Row returned by the tenant-scoped `GET /api/v1/candidates` list. */
/** Recruiter-side candidate detail, as candidate-service returns it. */
export type CandidateDetail = {
  id: string;
  email: string;
  fullName: string;
  headline?: string | null;
  summary?: string | null;
  locationCity?: string | null;
  locationRegion?: string | null;
  locationCountry?: string | null;
  availability?: string | null;
  visibility?: string | null;
  consentSearchable: boolean;
};

export type CandidateSummary = {
  id: string;
  email: string;
  fullName: string;
  headline?: string | null;
};

/** A job's must-haves for searching your own database. */
export type TalentQuery = {
  titles: string[];
  /** Every group is one must-have; any term in a group counts. */
  skills: string[][];
  exclude?: string[];
  limit?: number;
};

/** One of your own candidates, ranked by must-haves found. Searchable people only. */
export type TalentMatch = {
  id: string;
  fullName: string;
  headline?: string | null;
  locationCity?: string | null;
  locationRegion?: string | null;
  availability?: string | null;
  found: number;
  of: number;
  updatedAt: string;
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

export type ClientStatus = 'ACTIVE' | 'DORMANT' | 'PROSPECT';

/** A client company (job-service). Jobs point to it through organizationId. */
export type ClientRecord = {
  id: string;
  name: string;
  status: ClientStatus;
  channel: string;
  ownerUserId?: string | null;
  lastContactAt?: string | null;
  msaEndsOn?: string | null;
  /** Published jobs whose organizationId is this client. */
  openJobs: number;
  createdAt: string;
};

export type ClientInput = {
  name?: string;
  status?: ClientStatus;
  channel?: string;
  ownerUserId?: string;
  lastContactAt?: string;
  /** ISO date, e.g. 2027-03-31. */
  msaEndsOn?: string;
};

export type SubmittalStatus =
  | 'AWAITING_APPROVAL'
  | 'CLIENT_REVIEWING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'CLIENT_PASSED'
  | 'WITHDRAWN';

/** A candidate put forward to a client (application-service). Approving records a person sent it. */
export type SubmittalRecord = {
  id: string;
  applicationId: string;
  jobId: string;
  candidateProfileId: string;
  clientId?: string | null;
  channel: string;
  status: SubmittalStatus;
  /** Dollars per hour. */
  billRate?: number | null;
  ownerUserId?: string | null;
  approvedByUserId?: string | null;
  submittedAt?: string | null;
  lastClientActivityAt?: string | null;
  latestNote?: string | null;
  createdAt: string;
};

export type CreateSubmittalInput = {
  applicationId: string;
  clientId?: string;
  channel?: string;
  billRate?: number;
  ownerUserId?: string;
};

export type PlacementExtension = 'NONE' | 'ASKED' | 'AGREED' | 'DECLINED';

/** A person hired a candidate for a client (application-service). Dates are YYYY-MM-DD. */
/** One entry in the recruiter activity log, assembled from existing records. Newest first. */
export type ActivityRecord = {
  id: string;
  at: string;
  actorKind: 'PERSON' | 'AGENT' | 'SYSTEM';
  actorUserId?: string | null;
  /** A timeline entry type such as STATUS_CHANGE, or DRAFT_READY, DRAFT_FAILED, DRAFT_APPROVED,
   * DRAFT_REJECTED or SUBMITTAL_APPROVED. */
  code: string;
  fromValue?: string | null;
  toValue?: string | null;
  /** The AI artifact kind, submittal channel, or timeline summary. */
  detail?: string | null;
  reason?: string | null;
  applicationId?: string | null;
  candidateProfileId?: string | null;
  jobId?: string | null;
};

/** Desk report over the last `days` days. Counts only; no money is tracked yet. */
export type DeskReport = {
  days: number;
  since: string;
  funnel: { stage: string; count: number }[];
  /** By application source: DIRECT, JOB_BOARD, IMPORT or REFERRAL. */
  sources: { source: string; applications: number; submitted: number; started: number }[];
  /** By AI artifact kind: drafts put up for review and how people decided. */
  agents: { kind: string; proposals: number; approved: number; rejected: number }[];
};

export type PlacementRecord = {
  id: string;
  applicationId: string;
  jobId: string;
  candidateProfileId: string;
  clientId?: string | null;
  startDate: string;
  endDate: string;
  /** Dollars per hour. */
  billRate: number;
  payRate: number;
  extension: PlacementExtension;
  ownerUserId?: string | null;
  createdAt: string;
};

export type CreatePlacementInput = {
  applicationId: string;
  clientId?: string;
  startDate: string;
  endDate: string;
  billRate: number;
  payRate: number;
  ownerUserId?: string;
};

export type InterviewType = 'PHONE' | 'VIDEO' | 'ONSITE' | 'TECHNICAL' | 'PANEL';
export type InterviewStatus = 'SCHEDULED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type InterviewRecord = {
  id: string;
  applicationId: string;
  jobId: string;
  type: InterviewType;
  status: InterviewStatus;
  scheduledStart: string;
  scheduledEnd: string;
  location?: string | null;
  meetingUrl?: string | null;
  cancellationReason?: string | null;
  createdAt?: string | null;
};

export type InterviewRecommendation = 'STRONG_HIRE' | 'HIRE' | 'NO_HIRE' | 'STRONG_NO_HIRE';

export type InterviewFeedback = {
  id: string;
  interviewId: string;
  applicationId: string;
  interviewerUserId: string;
  overallScore?: number | null;
  recommendation?: InterviewRecommendation | null;
  scores: { area: string; score: number; note?: string | null }[];
  summary?: string | null;
  submittedAt: string;
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
    const userId = await options.getUserId?.();
    if (userId) {
      headers.set('X-Jobocate-User-Id', userId);
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
      listOpen: () => request<Job[]>(`/api/v1/jobs?status=PUBLISHED`),
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
      /** Newest first. `limit` is capped at 500 by the service. */
      listForJob: (jobId: string, opts: { status?: string; limit?: number } = {}) => {
        const q = new URLSearchParams();
        if (opts.status) q.set('status', opts.status);
        if (opts.limit) q.set('limit', String(opts.limit));
        const qs = q.toString();
        return request<ApplicationDetail[]>(
          `/api/v1/jobs/${encodeURIComponent(jobId)}/applications${qs ? `?${qs}` : ''}`,
        );
      },
      get: (id: string) =>
        request<ApplicationDetail>(`/api/v1/applications/${encodeURIComponent(id)}`),
      transition: (id: string, body: { to: string; rejectionReason?: string }) =>
        request<ApplicationDetail>(`/api/v1/applications/${encodeURIComponent(id)}/status`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      timeline: (id: string) =>
        request<TimelineEntry[]>(`/api/v1/applications/${encodeURIComponent(id)}/timeline`),
    },
    recruiterCandidates: {
      /** The caller's tenant candidates, newest first. Tenant comes from the auth header. */
      list: () => request<CandidateSummary[]>(`/api/v1/candidates`),
      get: (id: string) => request<CandidateDetail>(`/api/v1/candidates/${encodeURIComponent(id)}`),
      /** Ranks your own searchable candidates; contacts nobody. */
      search: (query: TalentQuery) =>
        request<TalentMatch[]>(`/api/v1/candidates/search`, {
          method: 'POST',
          body: JSON.stringify(query),
        }),
      resumes: (id: string) =>
        request<Resume[]>(`/api/v1/candidates/${encodeURIComponent(id)}/resumes`),
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
        request<Resume>(`/api/v1/me/resumes/${encodeURIComponent(resumeId)}/finalize`, {
          method: 'POST',
          body: JSON.stringify(body ?? {}),
        }),
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
        request<void>(`/api/v1/me/resumes/${encodeURIComponent(resumeId)}/parsed-fields/reject`, {
          method: 'POST',
        }),
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
          headers: input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : undefined,
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
      get: (id: string) => request<AiArtifact>(`/api/v1/ai-artifacts/${encodeURIComponent(id)}`),
      listForSubject: (subjectType: AiArtifactSubjectType, subjectId: string, limit = 50) => {
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
      /** Drafts waiting for a person to review, oldest first. Recruiter roles only. */
      reviewQueue: (limit = 50) =>
        request<AiArtifact[]>(`/api/v1/ai-artifacts/review-queue?limit=${encodeURIComponent(limit)}`),
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
    clients: {
      /** Clients by name, each with its count of open jobs. Recruiter roles only. */
      list: (params?: { status?: ClientStatus; limit?: number }) => {
        const qs = new URLSearchParams();
        if (params?.status) qs.set('status', params.status);
        if (params?.limit != null) qs.set('limit', String(params.limit));
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return request<ClientRecord[]>(`/api/v1/clients${suffix}`);
      },
      get: (id: string) => request<ClientRecord>(`/api/v1/clients/${encodeURIComponent(id)}`),
      create: (input: ClientInput & { name: string }) =>
        request<ClientRecord>(`/api/v1/clients`, { method: 'POST', body: JSON.stringify(input) }),
      update: (id: string, input: ClientInput) =>
        request<ClientRecord>(`/api/v1/clients/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
    },
    activity: {
      /** Newest first, up to 500. Recruiter roles only. */
      list: (limit?: number) =>
        request<ActivityRecord[]>(
          `/api/v1/activity${limit != null ? `?limit=${encodeURIComponent(String(limit))}` : ''}`,
        ),
    },
    reports: {
      /** Funnel, sources and agent decisions. Recruiter roles only. */
      desk: (days?: number) =>
        request<DeskReport>(
          `/api/v1/reports/desk${days != null ? `?days=${encodeURIComponent(String(days))}` : ''}`,
        ),
    },
    placements: {
      /** Newest start first. Recruiter roles only. */
      list: (limit?: number) =>
        request<PlacementRecord[]>(
          `/api/v1/placements${limit != null ? `?limit=${encodeURIComponent(String(limit))}` : ''}`,
        ),
      get: (id: string) =>
        request<PlacementRecord>(`/api/v1/placements/${encodeURIComponent(id)}`),
      /** Only for an application a person has already moved to HIRED. */
      create: (input: CreatePlacementInput) =>
        request<PlacementRecord>(`/api/v1/placements`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      update: (
        id: string,
        input: {
          endDate?: string;
          billRate?: number;
          payRate?: number;
          extension?: PlacementExtension;
        },
      ) =>
        request<PlacementRecord>(`/api/v1/placements/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
    },
    submittals: {
      /** Newest first. Recruiter roles only. */
      list: (params?: { status?: SubmittalStatus; limit?: number }) => {
        const qs = new URLSearchParams();
        if (params?.status) qs.set('status', params.status);
        if (params?.limit != null) qs.set('limit', String(params.limit));
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return request<SubmittalRecord[]>(`/api/v1/submittals${suffix}`);
      },
      get: (id: string) =>
        request<SubmittalRecord>(`/api/v1/submittals/${encodeURIComponent(id)}`),
      /** Creates it waiting for approval. Nothing goes to the client. */
      create: (input: CreateSubmittalInput) =>
        request<SubmittalRecord>(`/api/v1/submittals`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      /** A person approves it; needs getUserId. Records that they sent it to the client. */
      approve: (id: string) =>
        request<SubmittalRecord>(`/api/v1/submittals/${encodeURIComponent(id)}/approve`, {
          method: 'POST',
        }),
      clientUpdate: (id: string, input: { status?: SubmittalStatus; note?: string }) =>
        request<SubmittalRecord>(`/api/v1/submittals/${encodeURIComponent(id)}/client-update`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      withdraw: (id: string, reason?: string) =>
        request<SubmittalRecord>(`/api/v1/submittals/${encodeURIComponent(id)}/withdraw`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
    },
    interviews: {
      /** Scheduled and rescheduled interviews in a window, soonest first. Recruiter roles only. */
      upcoming: (params?: { from?: string; to?: string; limit?: number }) => {
        const qs = new URLSearchParams();
        if (params?.from) qs.set('from', params.from);
        if (params?.to) qs.set('to', params.to);
        if (params?.limit != null) qs.set('limit', String(params.limit));
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return request<InterviewRecord[]>(`/api/v1/interviews${suffix}`);
      },
      forApplication: (applicationId: string) =>
        request<InterviewRecord[]>(
          `/api/v1/interviews?applicationId=${encodeURIComponent(applicationId)}`,
        ),
      schedule: (input: {
        applicationId: string;
        type: InterviewType;
        scheduledStart: string;
        scheduledEnd: string;
        location?: string;
        meetingUrl?: string;
      }) =>
        request<InterviewRecord>(`/api/v1/interviews`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      cancel: (id: string, reason: string) =>
        request<InterviewRecord>(`/api/v1/interviews/${encodeURIComponent(id)}/cancel`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
      feedback: (id: string) =>
        request<InterviewFeedback[]>(`/api/v1/interviews/${encodeURIComponent(id)}/feedback`),
      submitFeedback: (
        id: string,
        input: {
          overallScore?: number;
          recommendation?: InterviewRecommendation;
          scores?: { area: string; score: number; note?: string }[];
          summary?: string;
        },
      ) =>
        request<InterviewFeedback>(`/api/v1/interviews/${encodeURIComponent(id)}/feedback`, {
          method: 'POST',
          body: JSON.stringify(input),
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
        request<void>(`/api/v1/candidates/me/saved-jobs/${encodeURIComponent(savedId)}`, {
          method: 'DELETE',
        }),
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
