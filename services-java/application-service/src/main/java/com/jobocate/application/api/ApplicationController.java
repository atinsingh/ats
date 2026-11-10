package com.jobocate.application.api;

import com.jobocate.application.application.ApplicationService;
import com.jobocate.application.application.ApplicationService.SubmitApplicationCommand;
import com.jobocate.application.infrastructure.persistence.ApplicationEntity;
import com.jobocate.application.infrastructure.persistence.ApplicationStatus;
import com.jobocate.application.infrastructure.persistence.ApplicationTimelineEntryEntity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
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

@RestController
@RequestMapping("/api/v1/applications")
public class ApplicationController {

    private final ApplicationService applications;

    public ApplicationController(ApplicationService applications) {
        this.applications = applications;
    }

    @GetMapping
    public List<ApplicationResponse> list() {
        return applications.listForTenant().stream().map(ApplicationResponse::from).toList();
    }

    @GetMapping("/{id}")
    public ApplicationResponse get(@PathVariable("id") UUID id) {
        return ApplicationResponse.from(applications.get(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApplicationResponse create(
            @Valid @RequestBody CreateApplicationRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(value = "X-Correlation-Id", required = false) UUID correlationId) {
        ApplicationEntity saved =
                applications.submit(
                        new SubmitApplicationCommand(
                                request.jobId(),
                                request.candidateProfileId(),
                                null,
                                idempotencyKey,
                                request.resumeIdUsed(),
                                request.coverLetterText(),
                                null,
                                "CANDIDATE",
                                correlationId));
        return ApplicationResponse.from(saved);
    }

    @PostMapping("/{id}/status")
    public ApplicationResponse changeStatus(
            @PathVariable("id") UUID id,
            @Valid @RequestBody ChangeStatusRequest request,
            @RequestHeader(value = "X-Correlation-Id", required = false) UUID correlationId) {
        ApplicationEntity updated =
                applications.transitionTo(
                        id, request.to(), request.rejectionReason(), null, "RECRUITER", correlationId);
        return ApplicationResponse.from(updated);
    }

    @PostMapping("/{id}/withdraw")
    public ApplicationResponse withdraw(
            @PathVariable("id") UUID id,
            @RequestBody(required = false) WithdrawRequest request,
            @RequestHeader(value = "X-Correlation-Id", required = false) UUID correlationId) {
        String reason = request == null ? null : request.reason();
        ApplicationEntity updated = applications.withdraw(id, reason, null, correlationId);
        return ApplicationResponse.from(updated);
    }

    @GetMapping("/{id}/timeline")
    public List<TimelineEntryResponse> timeline(
            @PathVariable("id") UUID id,
            @RequestParam(value = "limit", defaultValue = "100") int limit) {
        return applications.timeline(id, Math.min(Math.max(limit, 1), 500)).stream()
                .map(TimelineEntryResponse::from)
                .toList();
    }

    public record CreateApplicationRequest(
            @NotNull UUID jobId,
            @NotNull UUID candidateProfileId,
            UUID resumeIdUsed,
            String coverLetterText) {}

    public record ChangeStatusRequest(@NotNull ApplicationStatus to, String rejectionReason) {}

    public record WithdrawRequest(String reason) {}

    public record ApplicationResponse(
            String id,
            String tenantId,
            String jobId,
            String candidateProfileId,
            String status,
            String source,
            String resumeIdUsed,
            Instant appliedAt) {
        static ApplicationResponse from(ApplicationEntity a) {
            return new ApplicationResponse(
                    a.getId().toString(),
                    a.getTenantId().toString(),
                    a.getJobId().toString(),
                    a.getCandidateProfileId().toString(),
                    a.getStatus().name(),
                    a.getSource().name(),
                    a.getResumeIdUsed() == null ? null : a.getResumeIdUsed().toString(),
                    a.getAppliedAt());
        }
    }

    public record TimelineEntryResponse(
            String id,
            String entryType,
            String fromValue,
            String toValue,
            String summary,
            String actorUserId,
            String actorRole,
            Instant createdAt) {
        static TimelineEntryResponse from(ApplicationTimelineEntryEntity t) {
            return new TimelineEntryResponse(
                    t.getId().toString(),
                    t.getEntryType().name(),
                    t.getFromValue(),
                    t.getToValue(),
                    t.getSummary(),
                    t.getActorUserId() == null ? null : t.getActorUserId().toString(),
                    t.getActorRole(),
                    t.getCreatedAt());
        }
    }
}
