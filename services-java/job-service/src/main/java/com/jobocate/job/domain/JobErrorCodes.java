package com.jobocate.job.domain;

public final class JobErrorCodes {
    public static final String JOB_NOT_FOUND = "JOB_NOT_FOUND";
    public static final String JOB_NOT_PUBLISHABLE = "JOB_NOT_PUBLISHABLE";
    public static final String INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION";
    public static final String OPTIMISTIC_LOCK_CONFLICT = "OPTIMISTIC_LOCK_CONFLICT";
    public static final String VALIDATION_FAILED = "VALIDATION_FAILED";

    private JobErrorCodes() {}
}
