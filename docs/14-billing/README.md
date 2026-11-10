# 14 — Billing & subscriptions

Subscription plans, entitlements, seat/quota enforcement, Stripe integration, invoice generation, and sponsored job billing.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| `plans-and-entitlements.md` | Plan catalog (TRIAL, STARTER, GROWTH, ENTERPRISE), per-plan limits (recruiter seats, job postings, resume DB access, AI credits, sponsored slot count). | Planned |
| `stripe-integration.md` | Stripe setup, webhooks, signature verification, idempotent event handling, refund flow. | Planned |
| `invoices-and-payments.md` | Invoice generation, payment history, dunning, taxes (Stripe Tax). | Planned |
| `sponsored-jobs-billing.md` | Sponsored placement model, ranking impact, billing per impression/click/post. | Planned |
| `enforcement.md` | Where entitlements are enforced (gateway middleware, Spring service guards, OpenSearch query rewriter). | Planned |

## Non-negotiables

- Feature access is gated by entitlements; feature flags toggle availability for new feature rollouts.
- Stripe webhooks are verified by signature; events are processed idempotently using `stripe_event_id` as the dedupe key.
- AI usage decrements available quota at the worker boundary, not at the request boundary, to avoid over-billing on retries.
- Every billing-impacting event is audited.
