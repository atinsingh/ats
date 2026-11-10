package com.jobocate.application.infrastructure.persistence;

/**
 * Lifecycle states for an {@link AiArtifactEntity}. The state machine is:
 *
 * <pre>
 *   DRAFT ──▶ READY_FOR_REVIEW ──▶ APPROVED ──▶ ARCHIVED
 *      │             │                │
 *      └─▶ FAILED    └─▶ REJECTED ────┴─▶ ARCHIVED
 * </pre>
 *
 * <p>{@code FAILED} is a terminal-but-retryable state used when a worker
 * callback reports an error. The candidate/recruiter can request a
 * regeneration which creates a new artifact row.
 */
public enum AiArtifactStatus {
    DRAFT,
    READY_FOR_REVIEW,
    APPROVED,
    REJECTED,
    FAILED,
    ARCHIVED
}
