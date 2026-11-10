# 13 — Notifications

Notification types, delivery channels, preferences, rate limiting, and digest design.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| `notification-types.md` | Canonical event → notification mapping, payload templates, channel matrix. | Planned (Prompt 22 implements service). |
| `preferences-model.md` | User preference shape, per-channel opt-in, frequency, quiet hours. | Planned |
| `digest-design.md` | Digest cadences, content selection, batching rules. | Planned |
| `provider-abstraction.md` | Email provider interface, in-app, future SMS/push. | Planned |

## Channels (target)

- **Email** — SES / SendGrid behind a provider abstraction.
- **In-app** — Postgres-backed table consumed by web apps via polling (MVP) or websocket (post-MVP).
- **SMS / Push** — post-MVP.

## Non-negotiables

- Every outbound notification has a logged audit row (sender service, tenant, recipient, type, status).
- Per-user preferences are honored before send; opt-out is immediate.
- Rate limit per user per type to prevent loops on misbehaving consumers.
