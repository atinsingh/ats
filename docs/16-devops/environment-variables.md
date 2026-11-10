# Environment variable strategy

## Layers

1. **Infrastructure defaults** — `infra/docker/docker-compose.yml` sets hostnames and ports for local stacks (Postgres, Redis, Kafka, OpenSearch, MinIO).
2. **Repo-root `.env`** — optional single file for local overrides; **not committed**. Copy from `.env.example`.
3. **Per-runtime config** — production uses **12-factor** env vars or cloud parameter stores (SSM, Secrets Manager). Terraform outputs feed CI/CD.

## Naming conventions

- Prefix by system: `POSTGRES_*`, `KAFKA_*`, `OPENSEARCH_*`, `S3_*`, `REDIS_*`, `OTEL_*`.
- Prefix by service role: `JOB_SERVICE_*` only when necessary; prefer generic `SPRING_*` for Spring Boot.
- **Tenant context** is never taken from client-supplied headers alone; it must come from **signed JWT** (`tenant_id`) or internal service identity after gateway validation.

## Shared cross-cutting variables

| Variable | Purpose |
|----------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint (e.g. `http://localhost:4317`) |
| `OTEL_SERVICE_NAME` | Logical service name in traces |
| `KAFKA_BOOTSTRAP_SERVERS` | Broker list |
| `REDIS_URL` | Redis connection URL |
| `OPENSEARCH_URL` | OpenSearch HTTP endpoint |
| `S3_ENDPOINT` | S3 API endpoint (MinIO locally) |
| `S3_BUCKET_RESUMES` | Resume object bucket |
| `DATABASE_URL` or `SPRING_DATASOURCE_URL` | JDBC URL to Postgres |
| `JOBOCATE_JWT_SECRET` | Shared HS256 secret for demo JWT issuance and validation across Java services |
| `JOBOCATE_ALLOW_HEADER_TENANT` | When `true`, allows `X-Jobocate-Tenant-Id` for local dev only (must be `false` in production) |

## Frontend (Next.js)

- `NEXT_PUBLIC_API_BASE_URL` — BFF or API gateway base URL.
- `NEXT_PUBLIC_JOB_SERVICE_URL` — `job-service` base URL for job detail pages (e.g. `http://localhost:8082` when running that service directly).
- `NEXT_PUBLIC_APP_ENV` — `local` \| `staging` \| `prod` (non-secret).

Server-only:

- `AUTH_SECRET` — session / cookie signing (admin & recruiter apps).
- `TENANT_AUTH_ISSUER` — OIDC issuer URL for `tenant-auth-service`.
- `SEARCH_GATEWAY_URL` — Go `search-gateway` base URL for `job-portal-web` `/api/search/jobs` proxy (e.g. `http://localhost:7070`).
- `PORTAL_SEARCH_TENANT_ID` — Demo tenant UUID for local SERP; replace with session-derived tenant in production.

## Go services

- Use `LOG_LEVEL` (`debug`, `info`, `warn`, `error`).
- `HTTP_ADDR` (e.g. `:8080`) for bind address.
- OpenSearch and Kafka URLs match compose service DNS names when running in Docker network; use `localhost` when running on host.

## Python workers

- `KAFKA_CONSUMER_GROUP`, `KAFKA_TOPICS_RESUME_RAW`, `KAFKA_TOPICS_EMBEDDING_REQUEST`.
- Model endpoints (if calling external APIs) via `EMBEDDING_MODEL_ENDPOINT` — never hardcode keys in repo.

## Rotation & secrets

- Database passwords, Kafka SASL, and S3 keys are **secrets**; inject via CI/CD or ECS/K8s secrets.
- Document **required** vs **optional** vars in each service README (short table).
