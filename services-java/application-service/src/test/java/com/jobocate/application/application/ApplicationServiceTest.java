package com.jobocate.application.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jobocate.application.IntegrationTestBase;
import com.jobocate.application.application.ApplicationService.SubmitApplicationCommand;
import com.jobocate.application.domain.ApplicationErrorCodes;
import com.jobocate.application.domain.ApplicationException;
import com.jobocate.application.infrastructure.persistence.ApplicationEntity;
import com.jobocate.application.infrastructure.persistence.ApplicationJpaRepository;
import com.jobocate.application.infrastructure.persistence.ApplicationStatus;
import com.jobocate.application.infrastructure.persistence.ApplicationTimelineEntryEntity.TimelineEntryType;
import com.jobocate.application.infrastructure.persistence.ApplicationTimelineJpaRepository;
import com.jobocate.application.infrastructure.persistence.EventOutboxEntity;
import com.jobocate.application.infrastructure.persistence.EventOutboxJpaRepository;
import com.jobocate.platform.tenant.TenantContext;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ApplicationServiceTest extends IntegrationTestBase {

    @Autowired ApplicationService service;
    @Autowired ApplicationJpaRepository applications;
    @Autowired ApplicationTimelineJpaRepository timelineRepo;
    @Autowired EventOutboxJpaRepository outboxRepo;

    private static final UUID TENANT_A = UUID.fromString("00000000-0000-0000-0000-00000000000a");
    private static final UUID TENANT_B = UUID.fromString("00000000-0000-0000-0000-00000000000b");

    @BeforeEach
    void setTenant() {
        TenantContext.setCurrentTenant(TENANT_A);
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
        outboxRepo.deleteAll();
        timelineRepo.deleteAll();
        applications.deleteAll();
    }

    @Test
    void submitCreatesApplicationWithTimelineAndOutbox() {
        UUID job = UUID.randomUUID();
        UUID candidate = UUID.randomUUID();
        ApplicationEntity created =
                service.submit(
                        new SubmitApplicationCommand(
                                job, candidate, null, "k-1", null, null, null, "CANDIDATE", null));

        assertThat(created.getStatus()).isEqualTo(ApplicationStatus.APPLIED);
        assertThat(created.getTenantId()).isEqualTo(TENANT_A);

        var entries =
                timelineRepo.findByTenantIdAndApplicationIdOrderByCreatedAtDesc(
                        TENANT_A, created.getId(), org.springframework.data.domain.PageRequest.of(0, 10));
        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).getEntryType()).isEqualTo(TimelineEntryType.APPLIED);

        List<EventOutboxEntity> events = outboxRepo.findAll();
        assertThat(events).hasSize(1);
        assertThat(events.get(0).getEventType()).isEqualTo("application.submitted");
        assertThat(events.get(0).getStatus()).isEqualTo(EventOutboxEntity.OutboxStatus.PENDING);
    }

    @Test
    void submitWithSameIdempotencyKeyReturnsSameRow() {
        UUID job = UUID.randomUUID();
        UUID candidate = UUID.randomUUID();
        ApplicationEntity first =
                service.submit(
                        new SubmitApplicationCommand(
                                job, candidate, null, "idem-1", null, null, null, "CANDIDATE", null));
        ApplicationEntity second =
                service.submit(
                        new SubmitApplicationCommand(
                                job, candidate, null, "idem-1", null, null, null, "CANDIDATE", null));
        assertThat(second.getId()).isEqualTo(first.getId());
        assertThat(applications.count()).isEqualTo(1);
    }

    @Test
    void duplicateNonTerminalApplicationRejected() {
        UUID job = UUID.randomUUID();
        UUID candidate = UUID.randomUUID();
        service.submit(
                new SubmitApplicationCommand(
                        job, candidate, null, null, null, null, null, "CANDIDATE", null));
        assertThatThrownBy(
                        () ->
                                service.submit(
                                        new SubmitApplicationCommand(
                                                job,
                                                candidate,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                "CANDIDATE",
                                                null)))
                .isInstanceOf(ApplicationException.class)
                .hasFieldOrPropertyWithValue("code", ApplicationErrorCodes.APPLICATION_DUPLICATE);
    }

    @Test
    void duplicateAfterTerminalIsAllowed() {
        UUID job = UUID.randomUUID();
        UUID candidate = UUID.randomUUID();
        ApplicationEntity first =
                service.submit(
                        new SubmitApplicationCommand(
                                job, candidate, null, null, null, null, null, "CANDIDATE", null));
        service.transitionTo(
                first.getId(), ApplicationStatus.REJECTED, "no-fit", null, "RECRUITER", null);

        ApplicationEntity reapply =
                service.submit(
                        new SubmitApplicationCommand(
                                job, candidate, null, null, null, null, null, "CANDIDATE", null));
        assertThat(reapply.getId()).isNotEqualTo(first.getId());
        assertThat(reapply.getStatus()).isEqualTo(ApplicationStatus.APPLIED);
    }

    @Test
    void invalidTransitionRejected() {
        UUID job = UUID.randomUUID();
        UUID candidate = UUID.randomUUID();
        ApplicationEntity created =
                service.submit(
                        new SubmitApplicationCommand(
                                job, candidate, null, null, null, null, null, "CANDIDATE", null));
        // APPLIED → HIRED is not allowed (must pass through OFFERED).
        assertThatThrownBy(
                        () ->
                                service.transitionTo(
                                        created.getId(),
                                        ApplicationStatus.HIRED,
                                        null,
                                        null,
                                        "RECRUITER",
                                        null))
                .isInstanceOf(ApplicationException.class)
                .hasFieldOrPropertyWithValue(
                        "code", ApplicationErrorCodes.INVALID_STATE_TRANSITION);
    }

    @Test
    void crossTenantReadIsBlocked() {
        UUID job = UUID.randomUUID();
        UUID candidate = UUID.randomUUID();
        ApplicationEntity created =
                service.submit(
                        new SubmitApplicationCommand(
                                job, candidate, null, null, null, null, null, "CANDIDATE", null));

        TenantContext.setCurrentTenant(TENANT_B);
        assertThatThrownBy(() -> service.get(created.getId()))
                .isInstanceOf(ApplicationException.class)
                .hasFieldOrPropertyWithValue("code", ApplicationErrorCodes.APPLICATION_NOT_FOUND);
    }

    @Test
    void candidateCanWithdraw() {
        UUID job = UUID.randomUUID();
        UUID candidate = UUID.randomUUID();
        ApplicationEntity created =
                service.submit(
                        new SubmitApplicationCommand(
                                job, candidate, null, null, null, null, null, "CANDIDATE", null));
        ApplicationEntity withdrawn = service.withdraw(created.getId(), "moved-on", null, null);
        assertThat(withdrawn.getStatus()).isEqualTo(ApplicationStatus.WITHDRAWN);
        assertThat(outboxRepo.findAll())
                .extracting(EventOutboxEntity::getEventType)
                .contains("application.withdrawn");
    }
}
