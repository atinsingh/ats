# 10 — Recruiter UX

The recruiter-facing surface: information architecture, screen catalog, key flows, component patterns, and accessibility.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| `ia-and-navigation.md` | Sitemap of `ats-recruiter-web`, primary nav, breadcrumb rules, role-based visibility. | Planned |
| `screens.md` | Screen catalog: dashboard, jobs, job detail, applicants, candidate profile, kanban, list, notes, tags. Includes empty/loading/error states per screen. | Planned (Prompt 20 implements). |
| `kanban-and-bulk-actions.md` | Stage drag-and-drop semantics, optimistic updates, bulk action confirmations, undo windows. | Planned |
| `candidate-packet.md` | Recruiter view of a candidate: resume viewer, AI summary panel, notes, history, ratings, mentions. | Planned |

## Conventions

- Server components by default; `'use client'` only where interactivity is required (kanban DnD, modals, forms with optimistic updates).
- Use `@jobocate/ui` for primitives; lift recurring patterns out of an app and into the shared package once two apps need them.
- Every list view supports: empty state with primary CTA, loading skeleton, error state with retry, keyboard navigation, accessible focus, and a tenant-aware top bar.
