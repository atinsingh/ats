# 11 — Candidate UX

The candidate-facing surface: public marketplace, authenticated portal, application flows, AI assistance, and accessibility.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| `ia-and-navigation.md` | Sitemap of `job-portal-web` covering public + authenticated zones; SEO routing rules. | Planned |
| `screens.md` | Screen catalog: SERP, job detail, profile, resumes, applications, saved jobs, alerts, notification preferences. | Planned (Prompt 19 implements). |
| `apply-flow.md` | The end-to-end apply flow including idempotent submission, screening questions, resume selection, AI cover letter draft, consent confirmations. | Planned |
| `ai-copilot-flows.md` | Resume tailoring, cover letter draft, match explanation, interview prep — all with the human-in-the-loop review gate. | Planned |
| `consent-and-visibility-ui.md` | Visibility settings UI, consent confirmations, revocation flow. | Planned |

## Conventions

- Public pages must be SEO-friendly (server-rendered, structured data for `JobPosting`).
- All apply CTAs must work for unauthenticated users by routing through register/login first, then resuming the apply.
- AI-generated content is **always** labeled and **always** editable before submission.
