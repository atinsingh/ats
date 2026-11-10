package com.jobocate.application.api;

import com.jobocate.application.application.AiArtifactService;
import com.jobocate.application.application.AiArtifactService.RequestArtifactCommand;
import com.jobocate.application.infrastructure.persistence.AiArtifactEntity;
import com.jobocate.application.infrastructure.persistence.AiArtifactKind;
import com.jobocate.application.infrastructure.persistence.AiArtifactStatus;
import com.jobocate.application.infrastructure.persistence.AiArtifactSubjectType;
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

/**
 * Tenant-facing AI artifact endpoints. Caller can be a candidate, recruiter,
 * or admin — RBAC + ownership are layered on top in Prompt 24 (Spring Security
 * baseline). For now we trust the dev-only {@code X-Jobocate-User-Id} header
 * for {@code requestedByUserId} attribution.
 */
@RestController
@RequestMapping("/api/v1/ai-artifacts")
public class AiArtifactController {

    private final AiArtifactService service;

    public AiArtifactController(AiArtifactService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ArtifactResponse request(
            @Valid @RequestBody RequestArtifactRequest body,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(value = "X-Jobocate-User-Id", required = false) UUID actorUserId,
            @RequestHeader(value = "X-Correlation-Id", required = false) UUID correlationId) {
        AiArtifactEntity created =
                service.request(
                        new RequestArtifactCommand(
                                body.kind(),
                                body.subjectEntityType(),
                                body.subjectEntityId(),
                                body.relatedApplicationId(),
                                body.relatedJobId(),
                                body.relatedResumeId(),
                                body.promptVersion(),
                                body.modelVersion(),
                                body.inputs(),
                                body.reviewRequired(),
                                idempotencyKey,
                                actorUserId,
                                correlationId));
        return ArtifactResponse.from(created);
    }

    @GetMapping("/{id}")
    public ArtifactResponse get(@PathVariable("id") UUID id) {
        return ArtifactResponse.from(service.get(id));
    }

    @GetMapping
    public List<ArtifactResponse> list(
            @RequestParam(value = "subject_type", required = false) AiArtifactSubjectType subjectType,
            @RequestParam(value = "subject_id", required = false) UUID subjectId,
            @RequestParam(value = "kind", required = false) AiArtifactKind kind,
            @RequestParam(value = "mine_for_user", required = false) UUID mineForUser,
            @RequestParam(value = "limit", defaultValue = "50") int limit) {
        if (subjectType != null && subjectId != null) {
            return service.listForSubject(subjectType, subjectId, limit).stream()
                    .map(ArtifactResponse::from)
                    .toList();
        }
        if (mineForUser != null) {
            return service.listMine(mineForUser, limit).stream().map(ArtifactResponse::from).toList();
        }
        if (kind != null) {
            return service.listByKind(kind, limit).stream().map(ArtifactResponse::from).toList();
        }
        return List.of();
    }

    @PostMapping("/{id}/approve")
    public ArtifactResponse approve(
            @PathVariable("id") UUID id,
            @RequestHeader(value = "X-Jobocate-User-Id", required = false) UUID actorUserId,
            @RequestHeader(value = "X-Correlation-Id", required = false) UUID correlationId) {
        return ArtifactResponse.from(service.approve(id, actorUserId, correlationId));
    }

    @PostMapping("/{id}/reject")
    public ArtifactResponse reject(
            @PathVariable("id") UUID id,
            @RequestBody(required = false) RejectRequest body,
            @RequestHeader(value = "X-Jobocate-User-Id", required = false) UUID actorUserId,
            @RequestHeader(value = "X-Correlation-Id", required = false) UUID correlationId) {
        String reason = body == null ? null : body.reason();
        return ArtifactResponse.from(service.reject(id, reason, actorUserId, correlationId));
    }

    @PostMapping("/{id}/archive")
    public ArtifactResponse archive(
            @PathVariable("id") UUID id,
            @RequestHeader(value = "X-Jobocate-User-Id", required = false) UUID actorUserId,
            @RequestHeader(value = "X-Correlation-Id", required = false) UUID correlationId) {
        return ArtifactResponse.from(service.archive(id, actorUserId, correlationId));
    }

    public record RequestArtifactRequest(
            @NotNull AiArtifactKind kind,
            @NotNull AiArtifactSubjectType subjectEntityType,
            @NotNull UUID subjectEntityId,
            UUID relatedApplicationId,
            UUID relatedJobId,
            UUID relatedResumeId,
            String promptVersion,
            String modelVersion,
            Map<String, Object> inputs,
            Boolean reviewRequired) {}

    public record RejectRequest(String reason) {}

    public record ArtifactResponse(
            String id,
            String tenantId,
            AiArtifactKind kind,
            AiArtifactSubjectType subjectEntityType,
            String subjectEntityId,
            String relatedApplicationId,
            String relatedJobId,
            String relatedResumeId,
            String promptVersion,
            String modelVersion,
            AiArtifactStatus status,
            boolean reviewRequired,
            String requestedByUserId,
            String approvedByUserId,
            String rejectedByUserId,
            String rejectionReason,
            String failureReason,
            String outputText,
            String outputS3Key,
            Instant createdAt,
            Instant readyAt,
            Instant approvedAt,
            Instant rejectedAt) {

        public static ArtifactResponse from(AiArtifactEntity a) {
            return new ArtifactResponse(
                    a.getId().toString(),
                    a.getTenantId() == null ? null : a.getTenantId().toString(),
                    a.getKind(),
                    a.getSubjectEntityType(),
                    a.getSubjectEntityId().toString(),
                    a.getRelatedApplicationId() == null ? null : a.getRelatedApplicationId().toString(),
                    a.getRelatedJobId() == null ? null : a.getRelatedJobId().toString(),
                    a.getRelatedResumeId() == null ? null : a.getRelatedResumeId().toString(),
                    a.getPromptVersion(),
                    a.getModelVersion(),
                    a.getStatus(),
                    a.isReviewRequired(),
                    a.getRequestedByUserId() == null ? null : a.getRequestedByUserId().toString(),
                    a.getApprovedByUserId() == null ? null : a.getApprovedByUserId().toString(),
                    a.getRejectedByUserId() == null ? null : a.getRejectedByUserId().toString(),
                    a.getRejectionReason(),
                    a.getFailureReason(),
                    a.getOutputText(),
                    a.getOutputS3Key(),
                    a.getCreatedAt(),
                    a.getReadyAt(),
                    a.getApprovedAt(),
                    a.getRejectedAt());
        }
    }
}
