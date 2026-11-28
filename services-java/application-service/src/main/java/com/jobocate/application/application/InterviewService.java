package com.jobocate.application.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobocate.application.domain.ApplicationErrorCodes;
import com.jobocate.application.domain.ApplicationException;
import com.jobocate.application.infrastructure.persistence.ApplicationEntity;
import com.jobocate.application.infrastructure.persistence.ApplicationJpaRepository;
import com.jobocate.application.infrastructure.persistence.InterviewEntity;
import com.jobocate.application.infrastructure.persistence.InterviewEntity.InterviewStatus;
import com.jobocate.application.infrastructure.persistence.InterviewEntity.InterviewType;
import com.jobocate.application.infrastructure.persistence.InterviewFeedbackEntity;
import com.jobocate.application.infrastructure.persistence.InterviewFeedbackEntity.Recommendation;
import com.jobocate.application.infrastructure.persistence.InterviewFeedbackJpaRepository;
import com.jobocate.application.infrastructure.persistence.InterviewJpaRepository;
import com.jobocate.platform.tenant.TenantContext;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Interviews and scorecards. Every read and write is scoped to the tenant from trusted auth.
 * Scheduling an interview never moves the application's stage; a person does that.
 */
@Service
public class InterviewService {

    static final Duration MAX_LENGTH = Duration.ofHours(8);
    static final Duration MAX_WINDOW = Duration.ofDays(31);
    static final Duration DEFAULT_LOOKBACK = Duration.ofHours(1);
    static final Duration DEFAULT_LOOKAHEAD = Duration.ofDays(7);
    private static final EnumSet<InterviewStatus> UPCOMING =
            EnumSet.of(InterviewStatus.SCHEDULED, InterviewStatus.RESCHEDULED);

    private final InterviewJpaRepository interviews;
    private final InterviewFeedbackJpaRepository feedback;
    private final ApplicationJpaRepository applications;
    private final ObjectMapper json;

    public InterviewService(
            InterviewJpaRepository interviews,
            InterviewFeedbackJpaRepository feedback,
            ApplicationJpaRepository applications,
            ObjectMapper json) {
        this.interviews = interviews;
        this.feedback = feedback;
        this.applications = applications;
        this.json = json;
    }

    public record ScheduleCommand(
            UUID applicationId,
            InterviewType type,
            Instant start,
            Instant end,
            String location,
            String meetingUrl) {}

    public record AreaScore(String area, int score, String note) {}

    public record FeedbackCommand(
            Integer overallScore,
            Recommendation recommendation,
            List<AreaScore> scores,
            String summary) {}

    @Transactional
    public InterviewEntity schedule(ScheduleCommand cmd, UUID actorUserId) {
        UUID tenant = TenantContext.requireTenant();
        if (cmd.start() == null || cmd.end() == null || !cmd.end().isAfter(cmd.start())) {
            throw invalid("The end must be after the start");
        }
        if (Duration.between(cmd.start(), cmd.end()).compareTo(MAX_LENGTH) > 0) {
            throw invalid("An interview can be at most 8 hours long");
        }
        ApplicationEntity app =
                applications
                        .findByTenantIdAndId(tenant, cmd.applicationId())
                        .orElseThrow(
                                () ->
                                        new ApplicationException(
                                                ApplicationErrorCodes.APPLICATION_NOT_FOUND,
                                                HttpStatus.NOT_FOUND,
                                                "Application not found"));
        if (app.getStatus().isTerminal()) {
            throw new ApplicationException(
                    ApplicationErrorCodes.INTERVIEW_INVALID_STATE,
                    HttpStatus.CONFLICT,
                    "Cannot schedule an interview for a " + app.getStatus() + " application");
        }
        InterviewEntity entity =
                new InterviewEntity(
                        UUID.randomUUID(),
                        tenant,
                        app.getId(),
                        app.getJobId(),
                        cmd.type(),
                        cmd.start(),
                        cmd.end());
        entity.setLocation(blankToNull(cmd.location()));
        entity.setMeetingUrl(blankToNull(cmd.meetingUrl()));
        entity.setCreatedByUserId(actorUserId);
        entity.setUpdatedByUserId(actorUserId);
        return interviews.save(entity);
    }

    /** Scheduled and rescheduled interviews in a window, soonest first. */
    @Transactional(readOnly = true)
    public List<InterviewEntity> listUpcoming(Instant from, Instant to, int limit) {
        Instant now = Instant.now();
        Instant start = from != null ? from : now.minus(DEFAULT_LOOKBACK);
        Instant end = to != null ? to : start.plus(DEFAULT_LOOKAHEAD).plus(DEFAULT_LOOKBACK);
        if (!end.isAfter(start)) {
            throw invalid("'to' must be after 'from'");
        }
        if (Duration.between(start, end).compareTo(MAX_WINDOW) > 0) {
            throw invalid("The window can be at most 31 days");
        }
        return interviews.findByTenantIdAndStatusInAndScheduledStartBetweenOrderByScheduledStartAsc(
                TenantContext.requireTenant(),
                UPCOMING,
                start,
                end,
                PageRequest.of(0, Math.min(Math.max(limit, 1), 200)));
    }

    @Transactional(readOnly = true)
    public List<InterviewEntity> listForApplication(UUID applicationId) {
        return interviews.findByTenantIdAndApplicationIdOrderByScheduledStartAsc(
                TenantContext.requireTenant(), applicationId);
    }

    @Transactional
    public InterviewEntity cancel(UUID id, String reason, UUID actorUserId) {
        if (reason == null || reason.isBlank()) {
            throw invalid("A cancellation needs a reason");
        }
        InterviewEntity entity = load(id);
        if (!UPCOMING.contains(entity.getStatus())) {
            throw new ApplicationException(
                    ApplicationErrorCodes.INTERVIEW_INVALID_STATE,
                    HttpStatus.CONFLICT,
                    "Cannot cancel a " + entity.getStatus() + " interview");
        }
        entity.cancel(reason.trim());
        entity.setUpdatedByUserId(actorUserId);
        return interviews.save(entity);
    }

    @Transactional
    public InterviewFeedbackEntity submitFeedback(
            UUID interviewId, FeedbackCommand cmd, UUID interviewerUserId) {
        if (interviewerUserId == null) {
            throw invalid("A scorecard needs the interviewer's user id");
        }
        if (cmd.overallScore() != null && (cmd.overallScore() < 1 || cmd.overallScore() > 5)) {
            throw invalid("The overall score must be from 1 to 5");
        }
        List<AreaScore> scores = cmd.scores() == null ? List.of() : cmd.scores();
        for (AreaScore s : scores) {
            if (s.area() == null || s.area().isBlank() || s.score() < 1 || s.score() > 5) {
                throw invalid("Each area needs a name and a score from 1 to 5");
            }
        }
        InterviewEntity interview = load(interviewId);
        if (interview.getStatus() == InterviewStatus.CANCELLED) {
            throw new ApplicationException(
                    ApplicationErrorCodes.INTERVIEW_INVALID_STATE,
                    HttpStatus.CONFLICT,
                    "Cannot score a cancelled interview");
        }
        String structured;
        try {
            structured = json.writeValueAsString(java.util.Map.of("scores", scores));
        } catch (JsonProcessingException e) {
            throw invalid("Could not read the area scores");
        }
        return feedback.save(
                new InterviewFeedbackEntity(
                        UUID.randomUUID(),
                        interview.getId(),
                        interview.getApplicationId(),
                        interview.getTenantId(),
                        interviewerUserId,
                        cmd.overallScore() == null ? null : cmd.overallScore().shortValue(),
                        cmd.recommendation(),
                        structured,
                        blankToNull(cmd.summary())));
    }

    @Transactional(readOnly = true)
    public List<InterviewFeedbackEntity> listFeedback(UUID interviewId) {
        InterviewEntity interview = load(interviewId);
        return feedback.findByTenantIdAndInterviewIdOrderBySubmittedAtAsc(
                interview.getTenantId(), interview.getId());
    }

    private InterviewEntity load(UUID id) {
        return interviews
                .findByTenantIdAndId(TenantContext.requireTenant(), id)
                .orElseThrow(
                        () ->
                                new ApplicationException(
                                        ApplicationErrorCodes.INTERVIEW_NOT_FOUND,
                                        HttpStatus.NOT_FOUND,
                                        "Interview not found"));
    }

    private static ApplicationException invalid(String message) {
        return new ApplicationException(
                ApplicationErrorCodes.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, message);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
