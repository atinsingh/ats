package com.jobocate.application.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobocate.application.application.InterviewService;
import com.jobocate.application.application.InterviewService.AreaScore;
import com.jobocate.application.application.InterviewService.FeedbackCommand;
import com.jobocate.application.application.InterviewService.ScheduleCommand;
import com.jobocate.application.infrastructure.persistence.InterviewEntity;
import com.jobocate.application.infrastructure.persistence.InterviewEntity.InterviewStatus;
import com.jobocate.application.infrastructure.persistence.InterviewEntity.InterviewType;
import com.jobocate.application.infrastructure.persistence.InterviewFeedbackEntity;
import com.jobocate.application.infrastructure.persistence.InterviewFeedbackEntity.Recommendation;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Interviews and scorecards. Recruiter roles only; see SecurityConfig. */
@RestController
@RequestMapping("/api/v1/interviews")
public class InterviewController {

    private final InterviewService service;
    private final ObjectMapper json;

    public InterviewController(InterviewService service, ObjectMapper json) {
        this.service = service;
        this.json = json;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InterviewResponse schedule(
            @Valid @RequestBody ScheduleRequest body,
            @RequestHeader(value = "X-Jobocate-User-Id", required = false) UUID actorUserId) {
        return InterviewResponse.from(
                service.schedule(
                        new ScheduleCommand(
                                body.applicationId(),
                                body.type(),
                                body.scheduledStart(),
                                body.scheduledEnd(),
                                body.location(),
                                body.meetingUrl()),
                        actorUserId));
    }

    /** Upcoming interviews in a window, or every interview of one application. */
    @GetMapping
    public List<InterviewResponse> list(
            @RequestParam(value = "from", required = false) Instant from,
            @RequestParam(value = "to", required = false) Instant to,
            @RequestParam(value = "applicationId", required = false) UUID applicationId,
            @RequestParam(value = "limit", defaultValue = "100") int limit) {
        List<InterviewEntity> rows =
                applicationId != null
                        ? service.listForApplication(applicationId)
                        : service.listUpcoming(from, to, limit);
        return rows.stream().map(InterviewResponse::from).toList();
    }

    @PostMapping("/{id}/cancel")
    public InterviewResponse cancel(
            @PathVariable("id") UUID id,
            @RequestBody CancelRequest body,
            @RequestHeader(value = "X-Jobocate-User-Id", required = false) UUID actorUserId) {
        return InterviewResponse.from(service.cancel(id, body.reason(), actorUserId));
    }

    @PostMapping("/{id}/feedback")
    @ResponseStatus(HttpStatus.CREATED)
    public FeedbackResponse submitFeedback(
            @PathVariable("id") UUID id,
            @RequestBody FeedbackRequest body,
            @RequestHeader(value = "X-Jobocate-User-Id", required = false) UUID interviewerId) {
        return toResponse(
                service.submitFeedback(
                        id,
                        new FeedbackCommand(
                                body.overallScore(),
                                body.recommendation(),
                                body.scores(),
                                body.summary()),
                        interviewerId));
    }

    @GetMapping("/{id}/feedback")
    public List<FeedbackResponse> listFeedback(@PathVariable("id") UUID id) {
        return service.listFeedback(id).stream().map(this::toResponse).toList();
    }

    private FeedbackResponse toResponse(InterviewFeedbackEntity f) {
        List<AreaScore> scores;
        try {
            Map<String, List<AreaScore>> parsed =
                    json.readValue(f.getStructured(), new TypeReference<>() {});
            scores = parsed.getOrDefault("scores", List.of());
        } catch (Exception e) {
            scores = List.of();
        }
        return new FeedbackResponse(
                f.getId(),
                f.getInterviewId(),
                f.getApplicationId(),
                f.getInterviewerUserId(),
                f.getOverallScore() == null ? null : f.getOverallScore().intValue(),
                f.getRecommendation(),
                scores,
                f.getSummary(),
                f.getSubmittedAt());
    }

    public record ScheduleRequest(
            @NotNull UUID applicationId,
            @NotNull InterviewType type,
            @NotNull Instant scheduledStart,
            @NotNull Instant scheduledEnd,
            String location,
            String meetingUrl) {}

    public record CancelRequest(String reason) {}

    public record FeedbackRequest(
            Integer overallScore,
            Recommendation recommendation,
            List<AreaScore> scores,
            String summary) {}

    public record InterviewResponse(
            UUID id,
            UUID applicationId,
            UUID jobId,
            InterviewType type,
            InterviewStatus status,
            Instant scheduledStart,
            Instant scheduledEnd,
            String location,
            String meetingUrl,
            String cancellationReason,
            Instant createdAt) {
        static InterviewResponse from(InterviewEntity e) {
            return new InterviewResponse(
                    e.getId(),
                    e.getApplicationId(),
                    e.getJobId(),
                    e.getType(),
                    e.getStatus(),
                    e.getScheduledStart(),
                    e.getScheduledEnd(),
                    e.getLocation(),
                    e.getMeetingUrl(),
                    e.getCancellationReason(),
                    e.getCreatedAt());
        }
    }

    public record FeedbackResponse(
            UUID id,
            UUID interviewId,
            UUID applicationId,
            UUID interviewerUserId,
            Integer overallScore,
            Recommendation recommendation,
            List<AreaScore> scores,
            String summary,
            Instant submittedAt) {}
}
