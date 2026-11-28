package com.jobocate.application.application;

import com.jobocate.application.domain.ApplicationErrorCodes;
import com.jobocate.application.domain.ApplicationException;
import com.jobocate.application.infrastructure.persistence.ApplicationEntity;
import com.jobocate.application.infrastructure.persistence.ApplicationJpaRepository;
import com.jobocate.application.infrastructure.persistence.SubmittalEntity;
import com.jobocate.application.infrastructure.persistence.SubmittalEntity.SubmittalStatus;
import com.jobocate.application.infrastructure.persistence.SubmittalJpaRepository;
import com.jobocate.platform.tenant.TenantContext;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Submittals. Every read and write is scoped to the tenant from trusted auth. A submittal only
 * counts as sent once a person approves it, and nothing here sends anything to a client or VMS or
 * moves the application's stage.
 */
@Service
public class SubmittalService {

    static final int MAX_LIMIT = 500;
    static final int MAX_NOTE = 280;
    static final int MAX_CHANNEL = 64;

    private final SubmittalJpaRepository submittals;
    private final ApplicationJpaRepository applications;

    public SubmittalService(
            SubmittalJpaRepository submittals, ApplicationJpaRepository applications) {
        this.submittals = submittals;
        this.applications = applications;
    }

    public record CreateCommand(
            UUID applicationId,
            UUID clientId,
            String channel,
            BigDecimal billRate,
            UUID ownerUserId) {}

    @Transactional
    public SubmittalEntity create(CreateCommand cmd, UUID actorUserId) {
        UUID tenant = TenantContext.requireTenant();
        if (cmd.applicationId() == null) throw invalid("applicationId is required");
        if (cmd.billRate() != null && cmd.billRate().signum() < 0) {
            throw invalid("The bill rate cannot be negative");
        }
        String channel = blankToNull(cmd.channel());
        if (channel != null && channel.length() > MAX_CHANNEL) {
            throw invalid("The channel can be at most " + MAX_CHANNEL + " characters");
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
            throw conflict(
                    ApplicationErrorCodes.SUBMITTAL_INVALID_STATE,
                    "Cannot submit a " + app.getStatus() + " application");
        }
        if (submittals.existsByTenantIdAndApplicationIdAndStatusIn(
                tenant, app.getId(), SubmittalStatus.OPEN)) {
            throw conflict(
                    ApplicationErrorCodes.SUBMITTAL_DUPLICATE,
                    "This application already has an open submittal");
        }
        SubmittalEntity s =
                new SubmittalEntity(
                        UUID.randomUUID(),
                        tenant,
                        app.getId(),
                        app.getJobId(),
                        app.getCandidateProfileId());
        s.setClientId(cmd.clientId());
        if (channel != null) s.setChannel(channel);
        s.setBillRate(cmd.billRate());
        s.setOwnerUserId(cmd.ownerUserId() != null ? cmd.ownerUserId() : actorUserId);
        s.setCreatedByUserId(actorUserId);
        s.setUpdatedByUserId(actorUserId);
        return submittals.save(s);
    }

    /** Newest first, optionally one status. */
    @Transactional(readOnly = true)
    public List<SubmittalEntity> list(SubmittalStatus status, int limit) {
        UUID tenant = TenantContext.requireTenant();
        PageRequest page = PageRequest.of(0, Math.max(1, Math.min(limit, MAX_LIMIT)));
        return status == null
                ? submittals.findByTenantIdOrderByCreatedAtDesc(tenant, page)
                : submittals.findByTenantIdAndStatusOrderByCreatedAtDesc(tenant, status, page);
    }

    @Transactional(readOnly = true)
    public SubmittalEntity get(UUID id) {
        return load(id);
    }

    /** A person approves it, recording that they sent it to the client. */
    @Transactional
    public SubmittalEntity approve(UUID id, UUID personUserId) {
        if (personUserId == null) {
            throw invalid("A person must approve a submittal (X-Jobocate-User-Id)");
        }
        SubmittalEntity s = load(id);
        if (s.getStatus() != SubmittalStatus.AWAITING_APPROVAL) {
            throw conflict(
                    ApplicationErrorCodes.SUBMITTAL_INVALID_STATE,
                    "Only a submittal waiting for approval can be approved");
        }
        s.approve(personUserId, Instant.now());
        s.setUpdatedByUserId(personUserId);
        return s;
    }

    /** Records what the client said and when. Only once it is with the client. */
    @Transactional
    public SubmittalEntity recordClientUpdate(
            UUID id, SubmittalStatus next, String note, UUID actorUserId) {
        String text = blankToNull(note);
        if (next == null && text == null) throw invalid("Give a status, a note, or both");
        if (next != null && !SubmittalStatus.CLIENT_SET.contains(next)) {
            throw invalid("A client reply cannot set " + next);
        }
        if (text != null && text.length() > MAX_NOTE) {
            throw invalid("The note can be at most " + MAX_NOTE + " characters");
        }
        SubmittalEntity s = load(id);
        if (s.getStatus() == SubmittalStatus.AWAITING_APPROVAL
                || !SubmittalStatus.OPEN.contains(s.getStatus())) {
            throw conflict(
                    ApplicationErrorCodes.SUBMITTAL_INVALID_STATE,
                    "Client updates apply only to a submittal that is with the client");
        }
        s.recordClientUpdate(next, text, Instant.now());
        s.setUpdatedByUserId(actorUserId);
        return s;
    }

    @Transactional
    public SubmittalEntity withdraw(UUID id, String reason, UUID actorUserId) {
        String text = blankToNull(reason);
        if (text != null && text.length() > MAX_NOTE) {
            throw invalid("The reason can be at most " + MAX_NOTE + " characters");
        }
        SubmittalEntity s = load(id);
        if (!SubmittalStatus.OPEN.contains(s.getStatus())) {
            throw conflict(
                    ApplicationErrorCodes.SUBMITTAL_INVALID_STATE,
                    "This submittal is already closed");
        }
        s.withdraw(text);
        s.setUpdatedByUserId(actorUserId);
        return s;
    }

    private SubmittalEntity load(UUID id) {
        return submittals
                .findByTenantIdAndId(TenantContext.requireTenant(), id)
                .orElseThrow(
                        () ->
                                new ApplicationException(
                                        ApplicationErrorCodes.SUBMITTAL_NOT_FOUND,
                                        HttpStatus.NOT_FOUND,
                                        "Submittal not found"));
    }

    private static ApplicationException conflict(String code, String message) {
        return new ApplicationException(code, HttpStatus.CONFLICT, message);
    }

    private static ApplicationException invalid(String message) {
        return new ApplicationException(
                ApplicationErrorCodes.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, message);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
