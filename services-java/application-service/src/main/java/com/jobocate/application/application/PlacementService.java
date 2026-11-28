package com.jobocate.application.application;

import com.jobocate.application.domain.ApplicationErrorCodes;
import com.jobocate.application.domain.ApplicationException;
import com.jobocate.application.infrastructure.persistence.ApplicationEntity;
import com.jobocate.application.infrastructure.persistence.ApplicationJpaRepository;
import com.jobocate.application.infrastructure.persistence.ApplicationStatus;
import com.jobocate.application.infrastructure.persistence.PlacementEntity;
import com.jobocate.application.infrastructure.persistence.PlacementEntity.Extension;
import com.jobocate.application.infrastructure.persistence.PlacementJpaRepository;
import com.jobocate.application.infrastructure.persistence.SubmittalEntity;
import com.jobocate.application.infrastructure.persistence.SubmittalJpaRepository;
import com.jobocate.platform.tenant.TenantContext;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Placements. Every read and write is scoped to the tenant from trusted auth. A placement only
 * records a hire a person already made: it needs a HIRED application and never moves it.
 */
@Service
public class PlacementService {

    static final int MAX_LIMIT = 500;

    private final PlacementJpaRepository placements;
    private final ApplicationJpaRepository applications;
    private final SubmittalJpaRepository submittals;

    public PlacementService(
            PlacementJpaRepository placements,
            ApplicationJpaRepository applications,
            SubmittalJpaRepository submittals) {
        this.placements = placements;
        this.applications = applications;
        this.submittals = submittals;
    }

    public record CreateCommand(
            UUID applicationId,
            UUID clientId,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal billRate,
            BigDecimal payRate,
            UUID ownerUserId) {}

    /** Null fields stay unchanged. */
    public record UpdateCommand(
            LocalDate endDate, BigDecimal billRate, BigDecimal payRate, Extension extension) {}

    @Transactional
    public PlacementEntity create(CreateCommand cmd, UUID actorUserId) {
        UUID tenant = TenantContext.requireTenant();
        if (cmd.applicationId() == null) throw invalid("applicationId is required");
        if (cmd.startDate() == null || cmd.endDate() == null) {
            throw invalid("startDate and endDate are required");
        }
        if (cmd.billRate() == null || cmd.payRate() == null) {
            throw invalid("billRate and payRate are required");
        }
        checkDates(cmd.startDate(), cmd.endDate());
        checkRate(cmd.billRate(), "bill");
        checkRate(cmd.payRate(), "pay");
        ApplicationEntity app =
                applications
                        .findByTenantIdAndId(tenant, cmd.applicationId())
                        .orElseThrow(
                                () ->
                                        new ApplicationException(
                                                ApplicationErrorCodes.APPLICATION_NOT_FOUND,
                                                HttpStatus.NOT_FOUND,
                                                "Application not found"));
        if (app.getStatus() != ApplicationStatus.HIRED) {
            throw new ApplicationException(
                    ApplicationErrorCodes.PLACEMENT_NOT_HIRED,
                    HttpStatus.CONFLICT,
                    "Move the application to HIRED before recording a placement");
        }
        if (placements.existsByTenantIdAndApplicationId(tenant, app.getId())) {
            throw new ApplicationException(
                    ApplicationErrorCodes.PLACEMENT_DUPLICATE,
                    HttpStatus.CONFLICT,
                    "This application already has a placement");
        }
        PlacementEntity p =
                new PlacementEntity(
                        UUID.randomUUID(),
                        tenant,
                        app.getId(),
                        app.getJobId(),
                        app.getCandidateProfileId());
        UUID client = cmd.clientId();
        if (client == null) {
            client =
                    submittals
                            .findFirstByTenantIdAndApplicationIdOrderByCreatedAtDesc(
                                    tenant, app.getId())
                            .map(SubmittalEntity::getClientId)
                            .orElse(null);
        }
        p.setClientId(client);
        p.setStartDate(cmd.startDate());
        p.setEndDate(cmd.endDate());
        p.setBillRate(cmd.billRate());
        p.setPayRate(cmd.payRate());
        p.setOwnerUserId(cmd.ownerUserId() != null ? cmd.ownerUserId() : actorUserId);
        p.setCreatedByUserId(actorUserId);
        p.setUpdatedByUserId(actorUserId);
        return placements.save(p);
    }

    @Transactional(readOnly = true)
    public List<PlacementEntity> list(int limit) {
        return placements.findByTenantIdOrderByStartDateDescCreatedAtDesc(
                TenantContext.requireTenant(),
                PageRequest.of(0, Math.max(1, Math.min(limit, MAX_LIMIT))));
    }

    @Transactional(readOnly = true)
    public PlacementEntity get(UUID id) {
        return load(id);
    }

    @Transactional
    public PlacementEntity update(UUID id, UpdateCommand cmd, UUID actorUserId) {
        PlacementEntity p = load(id);
        if (cmd.endDate() != null) {
            checkDates(p.getStartDate(), cmd.endDate());
            p.setEndDate(cmd.endDate());
        }
        if (cmd.billRate() != null) {
            checkRate(cmd.billRate(), "bill");
            p.setBillRate(cmd.billRate());
        }
        if (cmd.payRate() != null) {
            checkRate(cmd.payRate(), "pay");
            p.setPayRate(cmd.payRate());
        }
        if (cmd.extension() != null) p.setExtension(cmd.extension());
        p.setUpdatedByUserId(actorUserId);
        return p;
    }

    private PlacementEntity load(UUID id) {
        return placements
                .findByTenantIdAndId(TenantContext.requireTenant(), id)
                .orElseThrow(
                        () ->
                                new ApplicationException(
                                        ApplicationErrorCodes.PLACEMENT_NOT_FOUND,
                                        HttpStatus.NOT_FOUND,
                                        "Placement not found"));
    }

    private static void checkDates(LocalDate start, LocalDate end) {
        if (end.isBefore(start)) throw invalid("The end date cannot be before the start date");
    }

    private static void checkRate(BigDecimal rate, String name) {
        if (rate.signum() < 0) throw invalid("The " + name + " rate cannot be negative");
    }

    private static ApplicationException invalid(String message) {
        return new ApplicationException(
                ApplicationErrorCodes.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, message);
    }
}
