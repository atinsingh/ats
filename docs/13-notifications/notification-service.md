# notification-service

End-to-end spec for the multi-channel notification service.

## Topics consumed

| Topic | Group | Action |
|---|---|---|
| `jobocate.application.events` | `jobocate-notification` | Translate `APPLICATION_SUBMITTED`, `APPLICATION_STATUS_CHANGED`, `APPLICATION_WITHDRAWN` into per-recipient notifications. Wraps the listener with `@RetryableTopic` (4 attempts, 2s backoff ×2) → `jobocate.application.events.DLT`. |
| `jobocate.job.events` | `jobocate-notification` | Currently observed only. Will become job-alert fan-out (post-MVP). |

## REST API

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET /api/v1/me/notifications?limit=25` | `X-Jobocate-User-Id` (until JWT identity ships) | `RECRUITER`, `CANDIDATE`, etc. | Recent notifications for the calling user. |
| `POST /api/v1/me/notifications/{id}/read` | same | same | Idempotent mark-read. |
| `GET /api/v1/me/notification-preferences` | same | same | List user prefs. Default-on for any (type, channel) without an explicit row. |
| `PUT /api/v1/me/notification-preferences` | same | same | Upsert single (type, channel) preference. Body: `{type, channel, enabled, cadence}`. |
| `POST /internal/v1/notifications` | bearer = `jobocate.internal-token` | service-to-service | Direct enqueue (used by AI workers, batch jobs). |

## Notification types

`APPLICATION_SUBMITTED`, `APPLICATION_RECEIVED`, `APPLICATION_STATUS_CHANGED`,
`INTERVIEW_SCHEDULED`, `INTERVIEW_RESCHEDULED`, `INTERVIEW_REMINDER`,
`INTERVIEW_FEEDBACK_COMPLETE`, `JOB_ALERT`, `SAVED_SEARCH_DIGEST`,
`AI_DRAFT_READY`, `OFFER_SENT`, `OFFER_ACCEPTED_CONFIRMATION`,
`MENTION`, `CANDIDATE_HIRED`, `CANDIDATE_WITHDREW`.

## Channels

`EMAIL`, `IN_APP`, `SMS` (SMS deferred — listener writes the row in `QUEUED` state but no dispatcher exists yet).

## Status lifecycle

```
QUEUED ──▶ SENT ──▶ DELIVERED       (DELIVERED is set by webhooks today; not yet wired)
   │           ╲
   │            ╲▶ FAILED            (retried per @RetryableTopic backoff; lands in DLT after 4 attempts)
   │
   └──▶ SUPPRESSED                   (preference off OR rate-limited)
```

## Idempotency

Each Kafka envelope must include an `event_id` (UUID). The
`notification_processed_events` table tracks them; a second delivery is a
no-op. For `APPLICATION_SUBMITTED` the listener derives a per-recipient
event id (`uuid5(event_id + ":candidate")` and `+ ":recruiter"`) so the same
domain event can fan out to two recipients without false-positives on
de-duplication.

## Rate limits

Per-(user, type) caps over a rolling 1-hour window. Defaults:

| Type | Per-hour cap |
|---|---|
| `JOB_ALERT` | 6 |
| `SAVED_SEARCH_DIGEST` | 3 |
| `AI_DRAFT_READY` | 20 |
| `MENTION` | 30 |
| `INTERVIEW_REMINDER` | 10 |
| _all others_ | 60 |

Exceeding a cap creates the notification row with `status = SUPPRESSED` so it
remains visible in `/api/v1/me/notifications` for audit, but no email is sent.

## Email provider

`EmailDispatcher` is an interface. Default bean is `LoggingEmailDispatcher`
(prints subject + body to logs, returns success). To wire a real provider
(SMTP, SES, SendGrid, …) supply a bean of type `EmailDispatcher` — the
default backs off via `@ConditionalOnMissingBean`.

## Audit + observability

Counters (Micrometer):

* `notification.created`
* `notification.suppressed`
* `notification.dispatched`
* `notification.failed`
* `notification.events.accepted`
* `notification.events.dropped`

Logs include `notification.dispatch`, `notification.dlt`, and structured
errors with the offending Kafka topic + key on `@DltHandler`.
