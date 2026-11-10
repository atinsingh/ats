package com.jobocate.application.domain;

/** Stable codes for the {@code error.code} field on the canonical error envelope. */
public final class ApplicationErrorCodes {

    public static final String JOB_NOT_PUBLISHED = "JOB_NOT_PUBLISHED";
    public static final String JOB_CLOSED = "JOB_CLOSED";
    public static final String APPLICATION_DUPLICATE = "APPLICATION_DUPLICATE";
    public static final String APPLICATION_NOT_FOUND = "APPLICATION_NOT_FOUND";
    public static final String INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION";
    public static final String OPTIMISTIC_LOCK_CONFLICT = "OPTIMISTIC_LOCK_CONFLICT";
    public static final String IDEMPOTENCY_KEY_REUSED = "IDEMPOTENCY_KEY_REUSED";
    public static final String VALIDATION_FAILED = "VALIDATION_FAILED";
    public static final String CANDIDATE_NOT_FOUND = "CANDIDATE_NOT_FOUND";
    public static final String FORBIDDEN_TENANT_SCOPE = "FORBIDDEN_TENANT_SCOPE";

    public static final String AI_ARTIFACT_NOT_FOUND = "AI_ARTIFACT_NOT_FOUND";
    public static final String AI_ARTIFACT_INVALID_STATE = "AI_ARTIFACT_INVALID_STATE";
    public static final String AI_ARTIFACT_NOT_REVIEWABLE = "AI_ARTIFACT_NOT_REVIEWABLE";

    private ApplicationErrorCodes() {}
}
