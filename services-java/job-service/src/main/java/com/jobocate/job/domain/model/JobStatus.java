package com.jobocate.job.domain.model;

/**
 * Canonical job lifecycle states. Mirrors the {@code chk_jobs_status}
 * constraint in the {@code jobs} table.
 *
 * <ul>
 *   <li>{@link #DRAFT} – created but not visible to candidates.
 *   <li>{@link #PUBLISHED} – live in marketplace search.
 *   <li>{@link #CLOSED} – no longer accepting applications; visible to recruiters.
 *   <li>{@link #ARCHIVED} – soft-archived for cleanup; hidden from recruiter default views.
 * </ul>
 */
public enum JobStatus {
    DRAFT,
    PUBLISHED,
    CLOSED,
    ARCHIVED
}
