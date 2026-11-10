export type DeliveryStatus = 'Available' | 'Scaffolded' | 'Planned';

export type CatalogItem = Readonly<{
  name: string;
  detail: string;
  path: string;
  status: DeliveryStatus;
}>;

export type CatalogGroup = Readonly<{
  name: string;
  purpose: string;
  items: readonly CatalogItem[];
}>;

export const quickStartCommands = [
  {
    label: 'Install workspace dependencies',
    command: 'pnpm install',
  },
  {
    label: 'Start local platform dependencies',
    command: 'docker compose -f infra/docker/docker-compose.yml up -d',
  },
  {
    label: 'Run the admin and developer hub',
    command: 'pnpm dev:admin',
  },
] as const;

export const architectureGroups: readonly CatalogGroup[] = [
  {
    name: 'Web experiences',
    purpose: 'Next.js 15 applications for candidates, recruiters, and platform operators.',
    items: [
      {
        name: 'Candidate portal',
        detail: 'Public job discovery, applications, resumes, and candidate AI tools.',
        path: 'apps/job-portal-web',
        status: 'Available',
      },
      {
        name: 'Recruiter workspace',
        detail: 'ATS dashboard, requisitions, and hiring pipeline surfaces.',
        path: 'apps/ats-recruiter-web',
        status: 'Scaffolded',
      },
      {
        name: 'Admin console',
        detail: 'Tenant operations, safety controls, and this developer hub.',
        path: 'apps/admin-console-web',
        status: 'Scaffolded',
      },
    ],
  },
  {
    name: 'Domain services',
    purpose: 'Spring Boot services own transactional workflows and PostgreSQL records.',
    items: [
      {
        name: 'Identity and tenancy',
        detail: 'JWT issuance, tenant context, recruiter seats, and role enforcement.',
        path: 'services-java/tenant-auth-service + ats-core-service',
        status: 'Scaffolded',
      },
      {
        name: 'Hiring workflows',
        detail: 'Jobs, candidates, applications, notifications, and admin operations.',
        path: 'services-java/*-service',
        status: 'Scaffolded',
      },
      {
        name: 'Search projection',
        detail: 'Projects domain events into tenant-isolated OpenSearch documents.',
        path: 'services-java/search-orchestrator-service',
        status: 'Scaffolded',
      },
    ],
  },
  {
    name: 'Search and ingestion',
    purpose: 'Low-latency search APIs and asynchronous content processing.',
    items: [
      {
        name: 'Search gateway',
        detail: 'Go service for public jobs, recruiter search, and autocomplete.',
        path: 'services-go/search-gateway',
        status: 'Scaffolded',
      },
      {
        name: 'Index utilities',
        detail: 'Index builder, reindex tool, autocomplete, and analytics collectors.',
        path: 'services-go',
        status: 'Scaffolded',
      },
      {
        name: 'Worker pool',
        detail: 'Python workers for resume parsing, AI artifacts, and embeddings.',
        path: 'workers-python',
        status: 'Scaffolded',
      },
    ],
  },
  {
    name: 'Platform foundation',
    purpose: 'Shared contracts, local infrastructure, observability, and deployment assets.',
    items: [
      {
        name: 'Contracts and SDK',
        detail: 'OpenAPI, JSON Schema, Kafka topics, and the typed TypeScript client.',
        path: 'packages/shared-contracts + packages/api-sdk',
        status: 'Available',
      },
      {
        name: 'Local infrastructure',
        detail: 'PostgreSQL, Redpanda, OpenSearch, MinIO, Jaeger, and telemetry.',
        path: 'infra/docker',
        status: 'Available',
      },
      {
        name: 'Cloud deployment',
        detail: 'Terraform modules for production infrastructure and managed services.',
        path: 'infra/terraform',
        status: 'Planned',
      },
    ],
  },
] as const;

export const apiContracts = [
  ['Authentication', 'auth-api.yaml'],
  ['Tenant administration', 'tenant-api.yaml'],
  ['Jobs', 'job-api.yaml'],
  ['Candidates', 'candidate-api.yaml'],
  ['Resumes', 'resume-api.yaml'],
  ['Applications', 'application-api.yaml'],
  ['Notifications', 'notification-api.yaml'],
  ['AI artifacts', 'ai-artifact-api.yaml'],
  ['Recruiter search', 'recruiter-search-gateway.yaml'],
  ['Public search', 'search-api.yaml'],
  ['Platform administration', 'admin-api.yaml'],
] as const;

export const localEndpoints = [
  ['Candidate portal', 'http://localhost:3000'],
  ['Recruiter workspace', 'http://localhost:3001'],
  ['Admin and developer hub', 'http://localhost:3002/developer'],
  ['Search gateway', 'http://localhost:8086'],
  ['Tenant auth service', 'http://localhost:8090'],
] as const;

export const guardrails = [
  {
    title: 'Tenant context is authoritative',
    detail:
      'Production tenant identity comes from the authenticated security context. Never accept a tenant ID from a request body.',
  },
  {
    title: 'Contracts change before consumers',
    detail:
      'Update OpenAPI, JSON Schema, or Kafka contracts before implementation and ship affected consumers in the same release train.',
  },
  {
    title: 'Search is a derived read model',
    detail:
      'PostgreSQL owns workflow state. OpenSearch receives denormalized documents through domain events and is never the record of truth.',
  },
  {
    title: 'AI output requires human review',
    detail:
      'AI artifacts move through review states and cannot submit applications, reject candidates, or make final employment decisions.',
  },
  {
    title: 'Local headers stay local',
    detail:
      'Development tenant headers are disabled in production. Do not build features that depend on the local escape hatch.',
  },
  {
    title: 'Sensitive data stays out of telemetry',
    detail:
      'Do not log resumes, prompts, access tokens, credentials, or candidate PII. Emit identifiers and safe operational metadata only.',
  },
] as const;

export const deliveryGates = [
  ['Plan', 'Scope, acceptance criteria, risks, dependencies, and rollback are explicit.'],
  ['Contract', 'External behavior and migration impact are reviewed before implementation.'],
  ['Test', 'Red, green, and refactor evidence covers the changed behavior and tenant boundaries.'],
  ['Review', 'Correctness, security, privacy, accessibility, and AI oversight are resolved.'],
  ['Release', 'Builds, migrations, observability, documentation, rollout, and rollback are ready.'],
] as const;

export const sourceDocuments = [
  ['Current implementation', 'docs/02-architecture/audit-as-is.md'],
  ['Functional requirements', 'docs/01-product/functional-requirements.md'],
  ['Security baseline', 'docs/08-security/security-baseline.md'],
  ['Tenancy strategy', 'docs/09-multi-tenancy/tenancy-strategy.md'],
  ['Testing strategy', 'docs/16-devops/testing-strategy.md'],
  ['Full SDLC playbook', 'docs/16-devops/full-sdlc.md'],
] as const;
