# UI and coding standards

Conventions for **Next.js frontends**, **shared UI**, and **backend/worker code** in the Jobocate monorepo. Goal: predictable reviews, accessible product UI, and safe multi-tenant behavior.

For stack-wide rules (Java, Go, Python, Flyway, OpenAPI, Kafka, security, logging), see [`coding-standards.md`](./coding-standards.md).

---

## Tooling (source of truth)

| Tool             | Scope                                     | Command / config                                                                                                              |
| ---------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Prettier**     | TS/TSX/JS/JSON/Markdown (per root script) | [`prettier.config.cjs`](../../prettier.config.cjs): `semi: true`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100` |
| **ESLint**       | Next apps                                 | `next lint` per app (`pnpm --filter @jobocate/<app> lint`)                                                                    |
| **pnpm + Turbo** | Workspaces                                | Root `package.json`; prefer `pnpm --filter <pkg>` for scoped tasks                                                            |

Run before PR:

```bash
pnpm format
pnpm lint
```

Add `pnpm build` for apps you touched.

---

## TypeScript and React (App Router)

### Structure

- **`src/app/`** — Routes, layouts, `page.tsx`, route handlers (`route.ts`), loading and error UI where user-visible.
- **Route segments** — Use **kebab-case** folders (`job-detail`, `saved-searches`).
- **Components** — **PascalCase** files (`JobFilterPanel.tsx`); colocate feature components under `src/components/<feature>/` when they grow beyond one route.
- **Default to Server Components** — Add `'use client'` only for interactivity (forms, hooks, browser APIs).

### Imports and modules

- Prefer **absolute imports** if configured in `tsconfig.json` (`@/`); otherwise consistent relative depth per app.
- **Internal navigation:** `next/link` for same-origin routes (satisfies `eslint-config-next` `no-html-link-for-pages`).
- **Environment:** Prefix client-exposed vars with `NEXT_PUBLIC_` only; never ship secrets to the browser.

### Types and API usage

- Prefer **explicit types** for public props and server action / handler payloads.
- Prefer **`@jobocate/api-sdk`** for HTTP calls to platform APIs once generated or hand-maintained—avoid ad-hoc `fetch` shapes duplicated across apps.

### Error and loading UX

- Use **`error.tsx`** / **`loading.tsx`** where routes fetch data.
- Surface **actionable** errors (retry, contact support); avoid raw stack traces in UI.

---

## UI / Tailwind / design

### Layout and density

- **Mobile-first:** Base styles for small viewports; enhance with `sm:`, `md:`, `lg:` (`min-width` breakpoints).
- **Max width:** Marketing pages may use `max-w-6xl` / `max-w-7xl` centered content; dense ATS views may use wider layouts on `xl:` — match the existing app’s shell.
- **Spacing:** Prefer Tailwind spacing scale (`gap-4`, `px-4`, `py-6`) over arbitrary pixels unless aligning to a design spec.

### Brand and tokens

- **Job seeker marketing / portal:** Use shared semantic colors (e.g. `jobocate-coral`, `jobocate-ink`) when extended in the app’s `tailwind.config.ts`; keep **recruiter** and **admin** apps visually distinct if product requires it.
- **Borders and elevation:** Subtle borders (`border-slate-200`) and soft shadows for cards; avoid heavy drop shadows on dense tables.

### Shared components

- Use **`@jobocate/ui`** for primitives (`Button`, future shadcn-derived components) to keep **focus rings**, **sizes**, and **variants** consistent.
- Extend shared UI in `packages/ui` when **two or more apps** need the same pattern; avoid copy-paste across three apps.

### Imagery

- Prefer **`next/image`** with meaningful **`alt`**; `priority` only for above-the-fold hero images.
- **Aspect ratios:** Use a wrapper with `aspect-*` or fixed height to prevent layout shift.

### Accessibility (required)

- **Headings:** One logical `<h1>` per view; descending order without skips.
- **Forms:** Every control has an associated **`<label>`** (or `aria-label` when design is icon-only).
- **Keyboard:** All interactive elements focusable and visible **focus** styles (do not remove outlines without a replacement).
- **Color:** Do not rely on color alone for state (pair with text, icon, or pattern).
- **Motion:** Respect `prefers-reduced-motion` for large animations where feasible.

### Internationalization (future-ready)

- Avoid hard-coding copy deep inside logic; centralize strings in components or a future i18n layer so keys can be extracted later.

---

## Java (Spring Boot)

- **Base package:** `com.jobocate.<service>`.
- **Layers:** Prefer `api` (controllers) → `application` (use cases) → `domain` → `infrastructure` (JPA, Kafka adapters).
- **DTOs:** Use **records** for request/response types where appropriate; validate with Jakarta Validation on boundaries.
- **Tenancy:** Resolve `tenant_id` from security context; pass explicitly into repositories—no implicit global queries.
- **Observability:** Use structured logging and OpenTelemetry as configured per service; include `tenant_id` in log fields only where policy allows.

---

## Go

- **HTTP:** Prefer `chi` router patterns already used in `services-go`.
- **Logging:** Use `log/slog` with constant keys (e.g. `http_request`).
- **Errors:** Return meaningful JSON bodies for client errors; avoid leaking internals in prod.
- **Tests:** Table-driven unit tests; `httptest` for handlers; build tags for integration (`//go:build integration`).

---

## Python (workers)

- **Layout:** Package under `src/` with `__main__.py` entrypoints as today.
- **Tests:** `pytest` for pure functions; golden files for parsers/embeddings per [`testing-strategy.md`](testing-strategy.md).
- **Secrets:** Read from environment; never commit API keys; mock HTTP to model providers in tests.

---

## Contracts and events

- **Single source of truth:** `packages/shared-contracts` for OpenAPI fragments, JSON Schema, Kafka topic names.
- **Breaking changes:** Version or document migration steps; coordinate **consumers** (Go gateway, Java services, `api-sdk`) in the same release train when possible.

---

## Git and pull requests

- **Small PRs:** Easier review and safer rollback; one concern per PR when practical.
- **Description:** What changed, why, and how to verify (commands run).
- **Screenshots:** For UI changes, include before/after or key states (empty, loading, error) in the PR body.

---

## Related documents

- [`implementation-plan.md`](../18-roadmap/implementation-plan.md) — phased delivery and milestones.
- [`portal-parity-roadmap.md`](../18-roadmap/portal-parity-roadmap.md) — product capabilities driving UI work.
- [`testing-strategy.md`](testing-strategy.md) — testing expectations per stack.
