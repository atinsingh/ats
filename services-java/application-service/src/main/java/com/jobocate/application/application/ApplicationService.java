package com.jobocate.application.application;

import com.jobocate.application.domain.ApplicationErrorCodes;
import com.jobocate.application.domain.ApplicationException;
import com.jobocate.application.domain.ApplicationStatusTransitions;
import com.jobocate.application.infrastructure.persistence.ApplicationEntity;
import com.jobocate.application.infrastructure.persistence.ApplicationJpaRepository;
import com.jobocate.application.infrastructure.persistence.ApplicationSource;
import com.jobocate.application.infrastructure.persistence.ApplicationStatus;
import com.jobocate.application.infrastructure.persistence.ApplicationTimelineEntryEntity;
import com.jobocate.application.infrastructure.persistence.ApplicationTimelineEntryEntity.TimelineEntryType;
import com.jobocate.application.infrastructure.persistence.ApplicationTimelineJpaRepository;
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
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Core ATS application workflow: submit, transition, withdraw, reject.
 * Tenant scope is read from {@link TenantContext}; never trust caller-supplied
 * {@code tenantId}.
 */
@Service
public class ApplicationService {

    private static final Logger log = LoggerFactory.getLogger(ApplicationService.class);

    private final ApplicationJpaRepository applications;
    private final ApplicationTimelineJpaRepository timeline;
    private final EventOutboxJpaRepository outbox;
    private final String topic;

    public ApplicationService(
            ApplicationJpaRepository applications,
            ApplicationTimelineJpaRepository timeline,
            EventOutboxJpaRepository outbox,
            @Value("${jobocate.kafka.application-events-topic:jobocate.application.events}")
                    String topic) {
        this.applications = applications;
        this.timeline = timeline;
        this.outbox = outbox;
        this.topic = topic;
    }

    /**
     * Submit a new application. Idempotent on {@code idempotencyKey}: replaying
     * the same key returns the originally-created application.
     */
    @Transactional
    public ApplicationEntity submit(SubmitApplicationCommand cmd) {
        UUID tenant = TenantContext.requireTenant();

        if (cmd.idempotencyKey() != null) {
            Optional<ApplicationEntity> prior =
                    applications.findByTenantIdAndSubmittedViaIdempotencyKey(
                            tenant, cmd.idempotencyKey());
            if (prior.isPresent()) {
                return prior.get();
            }
        }

        Optional<ApplicationEntity> dup =
                applications.findActiveDuplicate(tenant, cmd.jobId(), cmd.candidateProfileId());
        if (dup.isPresent()) {
            throw new ApplicationException(
                    ApplicationErrorCodes.APPLICATION_DUPLICATE,
                    HttpStatus.CONFLICT,
                    "An active application already exists for this candidate and job");
        }

        Instant now = Instant.now();
        ApplicationEntity entity = new ApplicationEntity();
        entity.setId(UUID.randomUUID());
        entity.setTenantId(tenant);
        entity.setJobId(cmd.jobId());
        entity.setCandidateProfileId(cmd.candidateProfileId());
        entity.setStatus(ApplicationStatus.APPLIED);
        entity.setSource(cmd.source() != null ? cmd.source() : ApplicationSource.DIRECT);
        entity.setAppliedAt(now);
        entity.setSubmittedViaIdempotencyKey(cmd.idempotencyKey());
        entity.setResumeIdUsed(cmd.resumeIdUsed());
        entity.setCoverLetterText(cmd.coverLetterText());
        entity.setCreatedByUserId(cmd.actorUserId());
        entity.setUpdatedByUserId(cmd.actorUserId());

        try {
            applications.save(entity);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // Lost a race against the partial-unique index for non-terminal dup.
            log.warn(
                    "Duplicate application race for tenant={} job={} candidate={}",
                    tenant,
                    cmd.jobId(),
                    cmd.candidateProfileId());
            throw new ApplicationException(
                    ApplicationErrorCodes.APPLICATION_DUPLICATE,
                    HttpStatus.CONFLICT,
                    "An active application already exists for this candidate and job");
        }

        appendTimeline(
                entity,
                TimelineEntryType.APPLIED,
                null,
                ApplicationStatus.APPLIED.name(),
                cmd.actorUserId(),
                cmd.actorRole(),
                "Application submitted",
                Map.of("source", entity.getSource().name()),
                cmd.correlationId());

        enqueueEvent(entity, "application.submitted", null, ApplicationStatus.APPLIED, cmd);

        return entity;
    }

    /** Recruiter / admin transition to a new status. */
    @Transactional
    public ApplicationEntity transitionTo(
            UUID applicationId,
            ApplicationStatus to,
            String rejectionReason,
            UUID actorUserId,
            String actorRole,
            UUID correlationId) {
        UUID tenant = TenantContext.requireTenant();
        ApplicationEntity entity = loadOrThrow(tenant, applicationId);

        ApplicationStatus from = entity.getStatus();
        if (!ApplicationStatusTransitions.isAllowed(from, to)) {
            throw new ApplicationException(
                    ApplicationErrorCodes.INVALID_STATE_TRANSITION,
                    HttpStatus.CONFLICT,
                    "Cannot transition application from " + from + " to " + to);
        }

        Instant now = Instant.now();
        entity.setStatus(to);
        if (to == ApplicationStatus.REJECTED) {
            entity.setRejectionReason(rejectionReason);
            entity.setTerminalAt(now);
        }
        if (to == ApplicationStatus.HIRED) {
            entity.setHiredAt(now);
            entity.setTerminalAt(now);
        }
        if (to == ApplicationStatus.EXPIRED) {
            entity.setTerminalAt(now);
        }
        entity.setUpdatedByUserId(actorUserId);

        try {
            applications.save(entity);
        } catch (OptimisticLockingFailureException ex) {
            throw new ApplicationException(
                    ApplicationErrorCodes.OPTIMISTIC_LOCK_CONFLICT,
                    HttpStatus.CONFLICT,
                    "Application was modified concurrently — refresh and retry");
        }

        appendTimeline(
                entity,
                TimelineEntryType.STATUS_CHANGE,
                from.name(),
                to.name(),
                actorUserId,
                actorRole,
                "Status changed " + from + " → " + to,
                rejectionReason == null ? Map.of() : Map.of("rejection_reason", rejectionReason),
                correlationId);

        enqueueEvent(
                entity,
                statusEventType(to),
                from,
                to,
                new SubmitApplicationCommand(
                        entity.getJobId(),
                        entity.getCandidateProfileId(),
                        entity.getSource(),
                        null,
                        null,
                        null,
                        actorUserId,
                        actorRole,
                        correlationId));
        return entity;
    }

    /** Candidate-initiated withdrawal (only from non-terminal states). */
    @Transactional
    public ApplicationEntity withdraw(
            UUID applicationId,
            String withdrawalReason,
            UUID actorUserId,
            UUID correlationId) {
        UUID tenant = TenantContext.requireTenant();
        ApplicationEntity entity = loadOrThrow(tenant, applicationId);

        ApplicationStatus from = entity.getStatus();
        if (!ApplicationStatusTransitions.isAllowed(from, ApplicationStatus.WITHDRAWN)) {
            throw new ApplicationException(
                    ApplicationErrorCodes.INVALID_STATE_TRANSITION,
                    HttpStatus.CONFLICT,
                    "Cannot withdraw an application in " + from + " state");
        }

        Instant now = Instant.now();
        entity.setStatus(ApplicationStatus.WITHDRAWN);
        entity.setWithdrawalReason(withdrawalReason);
        entity.setTerminalAt(now);
        entity.setUpdatedByUserId(actorUserId);
        applications.save(entity);

        appendTimeline(
                entity,
                TimelineEntryType.WITHDRAWN,
                from.name(),
                ApplicationStatus.WITHDRAWN.name(),
                actorUserId,
                "CANDIDATE",
                "Candidate withdrew",
                withdrawalReason == null ? Map.of() : Map.of("withdrawal_reason", withdrawalReason),
                correlationId);

        enqueueEvent(
                entity,
                "application.withdrawn",
                from,
                ApplicationStatus.WITHDRAWN,
                new SubmitApplicationCommand(
                        entity.getJobId(),
                        entity.getCandidateProfileId(),
                        entity.getSource(),
                        null,
                        null,
                        null,
                        actorUserId,
                        "CANDIDATE",
                        correlationId));
        return entity;
    }

    @Transactional(readOnly = true)
    public ApplicationEntity get(UUID id) {
        return loadOrThrow(TenantContext.requireTenant(), id);
    }

    @Transactional(readOnly = true)
    public List<ApplicationEntity> listForTenant() {
        return applications.findByTenantIdOrderByCreatedAtDesc(TenantContext.requireTenant());
    }

    @Transactional(readOnly = true)
    public List<ApplicationTimelineEntryEntity> timeline(UUID applicationId, int limit) {
        UUID tenant = TenantContext.requireTenant();
        // Touch the parent to verify tenant scope before reading the timeline.
        loadOrThrow(tenant, applicationId);
        return timeline.findByTenantIdAndApplicationIdOrderByCreatedAtDesc(
                tenant, applicationId, PageRequest.of(0, limit));
    }

    private ApplicationEntity loadOrThrow(UUID tenant, UUID id) {
        return applications
                .findByTenantIdAndId(tenant, id)
                .orElseThrow(
                        () ->
                                new ApplicationException(
                                        ApplicationErrorCodes.APPLICATION_NOT_FOUND,
                                        HttpStatus.NOT_FOUND,
                                        "Application not found"));
    }

    private void appendTimeline(
            ApplicationEntity entity,
            TimelineEntryType type,
            String fromValue,
            String toValue,
            UUID actorUserId,
            String actorRole,
            String summary,
            Map<String, Object> metadata,
            UUID correlationId) {
        ApplicationTimelineEntryEntity row = new ApplicationTimelineEntryEntity();
        row.setId(UUID.randomUUID());
        row.setApplicationId(entity.getId());
        row.setTenantId(entity.getTenantId());
        row.setEntryType(type);
        row.setFromValue(fromValue);
        row.setToValue(toValue);
        row.setActorUserId(actorUserId);
        row.setActorRole(actorRole);
        row.setSummary(summary);
        row.setMetadata(new HashMap<>(metadata));
        row.setCorrelationId(correlationId);
        row.setCreatedAt(Instant.now());
        timeline.save(row);
    }

    private void enqueueEvent(
            ApplicationEntity entity,
            String eventType,
            ApplicationStatus from,
            ApplicationStatus to,
            SubmitApplicationCommand cmd) {
        EventOutboxEntity row = new EventOutboxEntity();
        row.setId(UUID.randomUUID());
        row.setAggregateType("Application");
        row.setAggregateId(entity.getId());
        row.setTenantId(entity.getTenantId());
        row.setEventType(eventType);
        row.setTopic(topic);
        row.setPartitionKey(entity.getId().toString());
        row.setCreatedAt(Instant.now());
        row.setCorrelationId(cmd.correlationId());

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", eventType);
        payload.put("schema_version", "v1");
        payload.put("event_id", row.getId().toString());
        payload.put("occurred_at", Instant.now().toString());
        payload.put("tenant_id", entity.getTenantId().toString());
        payload.put("application_id", entity.getId().toString());
        payload.put("job_id", entity.getJobId().toString());
        payload.put("candidate_profile_id", entity.getCandidateProfileId().toString());
        payload.put("status", to.name());
        if (from != null) {
            payload.put("previous_status", from.name());
        }
        if (cmd.actorUserId() != null) {
            payload.put("actor_user_id", cmd.actorUserId().toString());
        }
        if (cmd.actorRole() != null) {
            payload.put("actor_role", cmd.actorRole());
        }
        row.setPayload(payload);

        Map<String, String> headers = new HashMap<>();
        if (cmd.correlationId() != null) {
            headers.put("X-Correlation-Id", cmd.correlationId().toString());
        }
        if (cmd.idempotencyKey() != null) {
            headers.put("X-Idempotency-Key", cmd.idempotencyKey());
        }
        row.setHeaders(headers);

        outbox.save(row);
    }

    private static String statusEventType(ApplicationStatus to) {
        return switch (to) {
            case SCREENING -> "application.screening";
            case SHORTLISTED -> "application.shortlisted";
            case INTERVIEW_SCHEDULED -> "application.interview_scheduled";
            case INTERVIEWED -> "application.interviewed";
            case OFFERED -> "application.offered";
            case HIRED -> "application.hired";
            case REJECTED -> "application.rejected";
            case EXPIRED -> "application.expired";
            case WITHDRAWN -> "application.withdrawn";
            default -> "application.status_changed";
        };
    }

    /** Inbound command for {@link #submit}. */
    public record SubmitApplicationCommand(
            @NotNull UUID jobId,
            @NotNull UUID candidateProfileId,
            ApplicationSource source,
            String idempotencyKey,
            UUID resumeIdUsed,
            String coverLetterText,
            UUID actorUserId,
            String actorRole,
            UUID correlationId) {}
}
