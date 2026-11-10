package com.jobocate.application.application;

import com.jobocate.application.domain.ApplicationErrorCodes;
import com.jobocate.application.domain.ApplicationException;
import com.jobocate.application.infrastructure.persistence.AiArtifactEntity;
import com.jobocate.application.infrastructure.persistence.AiArtifactJpaRepository;
import com.jobocate.application.infrastructure.persistence.AiArtifactKind;
import com.jobocate.application.infrastructure.persistence.AiArtifactStatus;
import com.jobocate.application.infrastructure.persistence.AiArtifactSubjectType;
import com.jobocate.application.infrastructure.persistence.EventOutboxEntity;
import com.jobocate.application.infrastructure.persistence.EventOutboxJpaRepository;
import com.jobocate.platform.tenant.TenantContext;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AI artifact lifecycle: request → worker callback → review (approve / reject)
 * → archive. Tenant scope is read from {@link TenantContext}; ownership checks
 * are deliberately deferred to the controller layer (which knows the calling
 * persona) so this service stays reusable from candidate-, recruiter-, and
 * worker-facing entry points.
 */
@Service
public class AiArtifactService {

    private static final Logger log = LoggerFactory.getLogger(AiArtifactService.class);

    private final AiArtifactJpaRepository artifacts;
    private final EventOutboxJpaRepository outbox;
    private final String topic;

    public AiArtifactService(
            AiArtifactJpaRepository artifacts,
            EventOutboxJpaRepository outbox,
            @Value("${jobocate.kafka.ai-artifact-events-topic:jobocate.ai.artifact.events}")
                    String topic) {
        this.artifacts = artifacts;
        this.outbox = outbox;
        this.topic = topic;
    }

    /**
     * Create a {@code DRAFT} artifact and enqueue an {@code ai.artifact.requested}
     * event for downstream workers. Idempotent on
     * {@link RequestArtifactCommand#idempotencyKey()} when set.
     */
    @Transactional
    public AiArtifactEntity request(RequestArtifactCommand cmd) {
        UUID tenant = TenantContext.requireTenant();

        if (cmd.idempotencyKey() != null) {
            Optional<AiArtifactEntity> prior =
                    artifacts.findByTenantIdAndIdempotencyKey(tenant, cmd.idempotencyKey());
            if (prior.isPresent()) {
                return prior.get();
            }
        }

        Instant now = Instant.now();
        AiArtifactEntity entity = new AiArtifactEntity();
        entity.setId(UUID.randomUUID());
        entity.setTenantId(tenant);
        entity.setKind(cmd.kind());
        entity.setSubjectEntityType(cmd.subjectType());
        entity.setSubjectEntityId(cmd.subjectId());
        entity.setRelatedApplicationId(cmd.relatedApplicationId());
        entity.setRelatedJobId(cmd.relatedJobId());
        entity.setRelatedResumeId(cmd.relatedResumeId());
        entity.setPromptVersion(cmd.promptVersion() == null ? "v0" : cmd.promptVersion());
        entity.setModelVersion(cmd.modelVersion() == null ? "pending" : cmd.modelVersion());
        entity.setInputs(cmd.inputs() == null ? new HashMap<>() : new HashMap<>(cmd.inputs()));
        entity.setReviewRequired(reviewRequiredDefault(cmd.kind(), cmd.reviewRequired()));
        entity.setRequestedByUserId(cmd.actorUserId());
        entity.setIdempotencyKey(cmd.idempotencyKey());
        entity.setCreatedByUserId(cmd.actorUserId());
        entity.setUpdatedByUserId(cmd.actorUserId());

        try {
            artifacts.save(entity);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // Lost a race against the partial-unique index on idempotency_key.
            return artifacts.findByTenantIdAndIdempotencyKey(tenant, cmd.idempotencyKey()).orElseThrow(
                    () -> ex);
        }

        enqueueEvent(
                entity,
                "ai.artifact.requested",
                Map.of(
                        "kind",
                        entity.getKind().name(),
                        "subject_entity_type",
                        entity.getSubjectEntityType().name(),
                        "subject_entity_id",
                        entity.getSubjectEntityId().toString()),
                cmd.correlationId());
        log.debug(
                "ai_artifact.requested id={} kind={} tenant={}",
                entity.getId(),
                entity.getKind(),
                tenant);
        return entity;
    }

    /**
     * Worker callback: record a successful generation. Idempotent on
     * {@link RecordResultCommand#idempotencyKey()} (when present): a second
     * delivery with the same key for the same artifact is a no-op.
     *
     * <p>Cross-tenant access is rejected — the worker must publish back to the
     * tenant of the originating request.
     */
    @Transactional
    public AiArtifactEntity recordSuccess(UUID tenantId, UUID artifactId, RecordResultCommand cmd) {
        AiArtifactEntity entity = loadOrThrow(tenantId, artifactId);

        if (entity.getStatus() == AiArtifactStatus.READY_FOR_REVIEW
                || entity.getStatus() == AiArtifactStatus.APPROVED) {
            // already-applied callback; idempotent no-op
            return entity;
        }
        if (entity.getStatus() == AiArtifactStatus.REJECTED
                || entity.getStatus() == AiArtifactStatus.ARCHIVED) {
            throw new ApplicationException(
                    ApplicationErrorCodes.AI_ARTIFACT_INVALID_STATE,
                    HttpStatus.CONFLICT,
                    "Artifact in terminal state " + entity.getStatus() + " cannot be updated");
        }

        if (cmd.outputText() != null) {
            entity.setOutputText(cmd.outputText());
        }
        if (cmd.outputS3Key() != null) {
            entity.setOutputS3Key(cmd.outputS3Key());
        }
        if (cmd.modelVersion() != null) {
            entity.setModelVersion(cmd.modelVersion());
        }
        if (cmd.promptVersion() != null) {
            entity.setPromptVersion(cmd.promptVersion());
        }

        Instant now = Instant.now();
        entity.markReady(now);
        artifacts.save(entity);

        enqueueEvent(
                entity,
                entity.isReviewRequired() ? "ai.artifact.ready_for_review" : "ai.artifact.approved",
                Map.of("auto_approved", String.valueOf(!entity.isReviewRequired())),
                cmd.correlationId());
        return entity;
    }

    /** Worker callback: record a generation failure. */
    @Transactional
    public AiArtifactEntity recordFailure(
            UUID tenantId, UUID artifactId, String reason, UUID correlationId) {
        AiArtifactEntity entity = loadOrThrow(tenantId, artifactId);
        if (entity.getStatus() == AiArtifactStatus.APPROVED
                || entity.getStatus() == AiArtifactStatus.REJECTED
                || entity.getStatus() == AiArtifactStatus.ARCHIVED) {
            return entity;
        }
        entity.markFailed(safeReason(reason), Instant.now());
        artifacts.save(entity);

        enqueueEvent(
                entity,
                "ai.artifact.failed",
                Map.of("failure_reason", entity.getFailureReason()),
                correlationId);
        return entity;
    }

    /** Candidate / recruiter approves an AI artifact for use. */
    @Transactional
    public AiArtifactEntity approve(UUID artifactId, UUID actorUserId, UUID correlationId) {
        UUID tenant = TenantContext.requireTenant();
        AiArtifactEntity entity = loadOrThrow(tenant, artifactId);
        if (entity.getStatus() != AiArtifactStatus.READY_FOR_REVIEW) {
            throw new ApplicationException(
                    ApplicationErrorCodes.AI_ARTIFACT_NOT_REVIEWABLE,
                    HttpStatus.CONFLICT,
                    "Artifact must be READY_FOR_REVIEW to be approved (was "
                            + entity.getStatus()
                            + ")");
        }
        entity.approve(actorUserId, Instant.now());
        entity.setUpdatedByUserId(actorUserId);
        artifacts.save(entity);

        enqueueEvent(
                entity,
                "ai.artifact.approved",
                Map.of("approved_by", String.valueOf(actorUserId)),
                correlationId);
        return entity;
    }

    /** Candidate / recruiter rejects an AI artifact (won't be used). */
    @Transactional
    public AiArtifactEntity reject(
            UUID artifactId, String reason, UUID actorUserId, UUID correlationId) {
        UUID tenant = TenantContext.requireTenant();
        AiArtifactEntity entity = loadOrThrow(tenant, artifactId);
        if (entity.getStatus() != AiArtifactStatus.READY_FOR_REVIEW
                && entity.getStatus() != AiArtifactStatus.FAILED) {
            throw new ApplicationException(
                    ApplicationErrorCodes.AI_ARTIFACT_NOT_REVIEWABLE,
                    HttpStatus.CONFLICT,
                    "Artifact must be READY_FOR_REVIEW or FAILED to be rejected (was "
                            + entity.getStatus()
                            + ")");
        }
        entity.reject(actorUserId, safeReason(reason), Instant.now());
        entity.setUpdatedByUserId(actorUserId);
        artifacts.save(entity);

        enqueueEvent(
                entity,
                "ai.artifact.rejected",
                Map.of("rejected_by", String.valueOf(actorUserId)),
                correlationId);
        return entity;
    }

    @Transactional
    public AiArtifactEntity archive(UUID artifactId, UUID actorUserId, UUID correlationId) {
        UUID tenant = TenantContext.requireTenant();
        AiArtifactEntity entity = loadOrThrow(tenant, artifactId);
        if (entity.getStatus() == AiArtifactStatus.ARCHIVED) {
            return entity;
        }
        entity.archive();
        entity.setUpdatedByUserId(actorUserId);
        artifacts.save(entity);

        enqueueEvent(entity, "ai.artifact.archived", Map.of(), correlationId);
        return entity;
    }

    @Transactional(readOnly = true)
    public AiArtifactEntity get(UUID id) {
        return loadOrThrow(TenantContext.requireTenant(), id);
    }

    @Transactional(readOnly = true)
    public List<AiArtifactEntity> listForSubject(
            AiArtifactSubjectType type, UUID subjectId, int limit) {
        return artifacts
                .findByTenantIdAndSubjectEntityTypeAndSubjectEntityIdOrderByCreatedAtDesc(
                        TenantContext.requireTenant(),
                        type,
                        subjectId,
                        PageRequest.of(0, Math.min(Math.max(limit, 1), 200)));
    }

    @Transactional(readOnly = true)
    public List<AiArtifactEntity> listMine(UUID requestedByUserId, int limit) {
        return artifacts.findByTenantIdAndRequestedByUserIdOrderByCreatedAtDesc(
                TenantContext.requireTenant(),
                requestedByUserId,
                PageRequest.of(0, Math.min(Math.max(limit, 1), 200)));
    }

    @Transactional(readOnly = true)
    public List<AiArtifactEntity> listByKind(AiArtifactKind kind, int limit) {
        return artifacts.findByTenantIdAndKindOrderByCreatedAtDesc(
                TenantContext.requireTenant(),
                kind,
                PageRequest.of(0, Math.min(Math.max(limit, 1), 200)));
    }

    private AiArtifactEntity loadOrThrow(UUID tenant, UUID id) {
        return artifacts
                .findByTenantIdAndId(tenant, id)
                .orElseThrow(
                        () ->
                                new ApplicationException(
                                        ApplicationErrorCodes.AI_ARTIFACT_NOT_FOUND,
                                        HttpStatus.NOT_FOUND,
                                        "AI artifact not found"));
    }

    private void enqueueEvent(
            AiArtifactEntity entity,
            String eventType,
            Map<String, String> extras,
            UUID correlationId) {
        EventOutboxEntity row = new EventOutboxEntity();
        row.setId(UUID.randomUUID());
        row.setAggregateType("AiArtifact");
        row.setAggregateId(entity.getId());
        row.setTenantId(entity.getTenantId());
        row.setEventType(eventType);
        row.setTopic(topic);
        row.setPartitionKey(entity.getId().toString());
        row.setCreatedAt(Instant.now());
        row.setCorrelationId(correlationId);

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", eventType);
        payload.put("schema_version", "v1");
        payload.put("event_id", row.getId().toString());
        payload.put("occurred_at", Instant.now().toString());
        payload.put("tenant_id", entity.getTenantId().toString());
        payload.put("artifact_id", entity.getId().toString());
        payload.put("kind", entity.getKind().name());
        payload.put("status", entity.getStatus().name());
        payload.put("subject_entity_type", entity.getSubjectEntityType().name());
        payload.put("subject_entity_id", entity.getSubjectEntityId().toString());
        payload.put("prompt_version", entity.getPromptVersion());
        payload.put("model_version", entity.getModelVersion());
        payload.put("review_required", entity.isReviewRequired());
        if (entity.getRelatedApplicationId() != null) {
            payload.put("related_application_id", entity.getRelatedApplicationId().toString());
        }
        if (entity.getRelatedJobId() != null) {
            payload.put("related_job_id", entity.getRelatedJobId().toString());
        }
        if (entity.getRelatedResumeId() != null) {
            payload.put("related_resume_id", entity.getRelatedResumeId().toString());
        }
        if (entity.getRequestedByUserId() != null) {
            payload.put("requested_by_user_id", entity.getRequestedByUserId().toString());
        }
        if (extras != null && !extras.isEmpty()) {
            payload.putAll(extras);
        }
        row.setPayload(payload);

        Map<String, String> headers = new HashMap<>();
        if (correlationId != null) {
            headers.put("X-Correlation-Id", correlationId.toString());
        }
        row.setHeaders(headers);

        outbox.save(row);
    }

    private static boolean reviewRequiredDefault(AiArtifactKind kind, Boolean explicit) {
        if (explicit != null) {
            return explicit;
        }
        // Anything candidate-submittable defaults to requiring human review per
        // PRD §3.12. Recruiter-only outputs (summaries, screening suggestions)
        // can be auto-approved; recruiter still chooses to use them.
        return switch (kind) {
            case CANDIDATE_SUMMARY,
                    MATCH_EXPLANATION,
                    SCREENING_QUESTIONS,
                    SHORTLIST_RECOMMENDATION -> false;
            default -> true;
        };
    }

    private static String safeReason(String s) {
        if (s == null) return null;
        return s.length() > 1000 ? s.substring(0, 1000) : s;
    }

    /** Inbound command for {@link #request(RequestArtifactCommand)}. */
    public record RequestArtifactCommand(
            @NotNull AiArtifactKind kind,
            @NotNull AiArtifactSubjectType subjectType,
            @NotNull UUID subjectId,
            UUID relatedApplicationId,
            UUID relatedJobId,
            UUID relatedResumeId,
            String promptVersion,
            String modelVersion,
            Map<String, Object> inputs,
            Boolean reviewRequired,
            String idempotencyKey,
            UUID actorUserId,
            UUID correlationId) {}

    /** Inbound command for {@link #recordSuccess(UUID, UUID, RecordResultCommand)}. */
    public record RecordResultCommand(
            String outputText,
            String outputS3Key,
            String modelVersion,
            String promptVersion,
            String idempotencyKey,
            UUID correlationId) {}
}
