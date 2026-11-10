package com.jobocate.application.infrastructure.persistence;

import java.util.EnumSet;
import java.util.Set;

/**
 * Canonical application lifecycle states. Mirrors
 * {@code chk_application_status} on the {@code applications} table and
 * {@code docs/04-workflows/application-state-machine.md}.
 */
public enum ApplicationStatus {
    DRAFT,
    APPLIED,
    SCREENING,
    SHORTLISTED,
    INTERVIEW_SCHEDULED,
    INTERVIEWED,
    OFFERED,
    HIRED,
    REJECTED,
    WITHDRAWN,
    EXPIRED;

    private static final Set<ApplicationStatus> TERMINAL =
            EnumSet.of(HIRED, REJECTED, WITHDRAWN, EXPIRED);

    public boolean isTerminal() {
        return TERMINAL.contains(this);
    }
}
