package com.jobocate.application.domain;

import com.jobocate.application.infrastructure.persistence.ApplicationStatus;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Allowed application state transitions. Mirrors the table in
 * {@code docs/04-workflows/application-state-machine.md}.
 *
 * <p>Authorization (which actor may perform a transition) is enforced
 * separately in the security layer.
 */
public final class ApplicationStatusTransitions {

    private static final Map<ApplicationStatus, Set<ApplicationStatus>> ALLOWED =
            Map.ofEntries(
                    Map.entry(
                            ApplicationStatus.DRAFT,
                            EnumSet.of(ApplicationStatus.APPLIED, ApplicationStatus.WITHDRAWN)),
                    Map.entry(
                            ApplicationStatus.APPLIED,
                            EnumSet.of(
                                    ApplicationStatus.SCREENING,
                                    ApplicationStatus.SHORTLISTED,
                                    ApplicationStatus.REJECTED,
                                    ApplicationStatus.WITHDRAWN,
                                    ApplicationStatus.EXPIRED)),
                    Map.entry(
                            ApplicationStatus.SCREENING,
                            EnumSet.of(
                                    ApplicationStatus.SHORTLISTED,
                                    ApplicationStatus.INTERVIEW_SCHEDULED,
                                    ApplicationStatus.REJECTED,
                                    ApplicationStatus.WITHDRAWN,
                                    ApplicationStatus.EXPIRED)),
                    Map.entry(
                            ApplicationStatus.SHORTLISTED,
                            EnumSet.of(
                                    ApplicationStatus.INTERVIEW_SCHEDULED,
                                    ApplicationStatus.OFFERED,
                                    ApplicationStatus.REJECTED,
                                    ApplicationStatus.WITHDRAWN,
                                    ApplicationStatus.EXPIRED)),
                    Map.entry(
                            ApplicationStatus.INTERVIEW_SCHEDULED,
                            EnumSet.of(
                                    ApplicationStatus.INTERVIEWED,
                                    ApplicationStatus.REJECTED,
                                    ApplicationStatus.WITHDRAWN,
                                    ApplicationStatus.EXPIRED)),
                    Map.entry(
                            ApplicationStatus.INTERVIEWED,
                            EnumSet.of(
                                    ApplicationStatus.INTERVIEW_SCHEDULED,
                                    ApplicationStatus.SHORTLISTED,
                                    ApplicationStatus.OFFERED,
                                    ApplicationStatus.REJECTED,
                                    ApplicationStatus.WITHDRAWN,
                                    ApplicationStatus.EXPIRED)),
                    Map.entry(
                            ApplicationStatus.OFFERED,
                            EnumSet.of(
                                    ApplicationStatus.HIRED,
                                    ApplicationStatus.REJECTED,
                                    ApplicationStatus.WITHDRAWN,
                                    ApplicationStatus.EXPIRED)),
                    Map.entry(ApplicationStatus.HIRED, EnumSet.noneOf(ApplicationStatus.class)),
                    Map.entry(ApplicationStatus.REJECTED, EnumSet.noneOf(ApplicationStatus.class)),
                    Map.entry(ApplicationStatus.WITHDRAWN, EnumSet.noneOf(ApplicationStatus.class)),
                    Map.entry(ApplicationStatus.EXPIRED, EnumSet.noneOf(ApplicationStatus.class)));

    private ApplicationStatusTransitions() {}

    public static boolean isAllowed(ApplicationStatus from, ApplicationStatus to) {
        if (from == to) {
            return false;
        }
        Set<ApplicationStatus> next = ALLOWED.get(from);
        return next != null && next.contains(to);
    }
}
