# Greenfield SQL bootstrap

This folder holds the **single-file** consolidated DDL for spinning up a brand-new
PostgreSQL database with the full Jobocate ATS schema in one shot.

## When to use this

| Scenario | Use this file? |
|---|---|
| Brand-new empty PostgreSQL database (e.g., a fresh Docker volume, a new staging cluster, or a developer's first run on a fresh machine). | **Yes** — apply `V1__initial_ats_schema.sql` directly. |
| Existing dev / CI / staging database that has already booted any of the Java services (and therefore already has per-service `flyway_*_schema_history` tables and the `V1` baselines). | **No** — let each service apply its own `V2+` additive migrations under `services-java/<service>/src/main/resources/db/migration/`. |

Mixing the two paths will cause Flyway baseline conflicts.

## How to apply

```bash
psql -h localhost -U jobocate -d jobocate \
  -f infra/sql/greenfield/V1__initial_ats_schema.sql
```

After this runs, you can start the Java services with `flyway.baselineOnMigrate=true` and they will record their own per-service histories on top of the existing tables (or you can disable Flyway entirely on already-bootstrapped DBs by setting `spring.flyway.enabled=false`).

## What's inside

The file is a single Flyway-style `V1__initial_ats_schema.sql` that creates every table required for the MVP plus post-MVP placeholders for interviews and offers. It is functionally equivalent to running these per-service histories end to end:

- `ats-core-service` — `tenants`
- `tenant-auth-service` — `users`, `user_roles`, `password_reset_tokens`, `refresh_tokens`, `invitations`
- `candidate-service` — `candidate_profiles`, `candidate_work_experiences`, `candidate_educations`, `candidate_certifications`, `resumes`, `resume_parsed_fields`, `resume_variants`, `consent_records`, `saved_searches`, `alert_subscriptions`, `saved_jobs`
- `job-service` — `jobs`, `job_skills`, `screening_questions`, `hiring_team_members`, `event_outbox`
- `application-service` — `pipelines`, `pipeline_stages`, `applications`, `application_timeline_entries`, `application_notes`, `application_tags`, `application_ratings`, `ai_artifacts`, `event_outbox`
- `notification-service` — `notifications`, `notification_preferences`
- `admin-service` — `audit_events`, `feature_flags`, `ai_quotas`, `prompt_versions`, `moderation_queue_items`
- Post-MVP placeholders — `interviews`, `interview_participants`, `interview_feedback`, `offers`

See [`docs/03-domain-model/database-design.md`](../../../docs/03-domain-model/database-design.md) for the design rationale behind every column, index, and constraint.
