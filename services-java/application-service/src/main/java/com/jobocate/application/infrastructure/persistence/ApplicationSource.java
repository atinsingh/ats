package com.jobocate.application.infrastructure.persistence;

/** How an application entered the system. */
public enum ApplicationSource {
    DIRECT,
    JOB_BOARD,
    IMPORT,
    REFERRAL
}
