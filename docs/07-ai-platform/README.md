# 07 — AI platform

Everything related to AI-generated content on the platform: artifact lifecycle, prompt and model versioning, quotas, human-in-the-loop guarantees, worker contracts, and labeling.

## Files (current and planned)

| File | Purpose | Status |
|------|---------|--------|
| `ai-artifact-platform.md` | Artifact types (resume variant, cover letter, candidate summary, match explanation, interview Q&A), lifecycle states (DRAFT → READY_FOR_REVIEW → APPROVED → REJECTED → ARCHIVED), metadata, audit, APIs. | Planned (Prompt 23) |
| `prompt-and-model-registry.md` | Versioning of prompts and model identifiers, change-control process, A/B testing, rollback. | Planned |
| `quotas-and-cost-controls.md` | Per-tenant AI credit budgets, per-user soft limits, abuse detection, throttling. | Planned |
| `worker-contracts.md` | Kafka topics and payload schemas the AI workers consume and produce. | Planned |
| `human-in-the-loop.md` | Mandatory review gates, what gets sent without review, what cannot. | Planned |

## Non-negotiables

- **Candidates must explicitly approve** any AI-drafted content (resume variant, cover letter, application packet) before it is submitted to a job.
- **Recruiters see clear AI labels** on summaries, match explanations, and screening question suggestions.
- **AI scoring never auto-rejects** a candidate; it only annotates. Human action is required to change application state.
- **Every artifact records** prompt version, model version, input references (resume id, job id, etc.), `created_by`, `created_at`, status, and any reviewer.
- **PII redaction rules** are applied to model inputs where the artifact will leave the candidate's tenant or be persisted in shared logs.
