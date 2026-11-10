package com.jobocate.job.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jobocate.job.IntegrationTestBase;
import com.jobocate.job.application.JobCommandService.JobInput;
import com.jobocate.job.domain.JobErrorCodes;
import com.jobocate.job.domain.JobException;
import com.jobocate.job.domain.model.Job;
import com.jobocate.job.domain.model.JobStatus;
import com.jobocate.job.infrastructure.persistence.EventOutboxEntity;
import com.jobocate.job.infrastructure.persistence.EventOutboxJpaRepository;
import com.jobocate.platform.tenant.TenantContext;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class JobCommandServiceTest extends IntegrationTestBase {

    @Autowired JobCommandService service;
    @Autowired EventOutboxJpaRepository outbox;

    private static final UUID TENANT_A = UUID.fromString("00000000-0000-0000-0000-00000000000a");
    private static final UUID TENANT_B = UUID.fromString("00000000-0000-0000-0000-00000000000b");

    @BeforeEach
    void setTenant() {
        TenantContext.setCurrentTenant(TENANT_A);
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
        outbox.deleteAll();
    }

    @Test
    void createDraftPersistsAsDraftAndEnqueuesEvent() {
        Job draft = service.createDraft(minimal("Backend Engineer"), null);
        assertThat(draft.status()).isEqualTo(JobStatus.DRAFT);
        assertThat(draft.tenantId()).isEqualTo(TENANT_A);
        assertThat(draft.slug()).isNotBlank();
        assertThat(outbox.findAll())
                .extracting(EventOutboxEntity::getEventType)
                .contains("job.upserted");
    }

    @Test
    void publishRequiresMinimumFields() {
        Job draft =
                service.createDraft(
                        new JobInput(
                                "Title only", null, null, null, null, null, null, null, null, null,
                                null, null, null, null, null, null, null, null, List.of()),
                        null);
        assertThatThrownBy(() -> service.publish(draft.id(), null))
                .isInstanceOf(JobException.class)
                .hasFieldOrPropertyWithValue("code", JobErrorCodes.JOB_NOT_PUBLISHABLE);
    }

    @Test
    void publishMovesDraftToPublishedAndEnqueuesPublishedEvent() {
        Job draft = service.createDraft(minimal("Senior Engineer"), null);
        outbox.deleteAll();

        Job published = service.publish(draft.id(), null);
        assertThat(published.status()).isEqualTo(JobStatus.PUBLISHED);
        assertThat(published.publishedAt()).isNotNull();
        assertThat(outbox.findAll())
                .extracting(EventOutboxEntity::getEventType)
                .contains("job.published");

        assertThat(service.listPublishedJobs(20, 0))
                .extracting(Job::id)
                .contains(published.id());
    }

    @Test
    void unpublishMovesPublishedBackToDraft() {
        Job draft = service.createDraft(minimal("Designer"), null);
        Job published = service.publish(draft.id(), null);
        outbox.deleteAll();

        Job unpublished = service.unpublish(published.id(), null);
        assertThat(unpublished.status()).isEqualTo(JobStatus.DRAFT);
        assertThat(outbox.findAll())
                .extracting(EventOutboxEntity::getEventType)
                .contains("job.unpublished");
    }

    @Test
    void unpublishRejectsDraftJobs() {
        Job draft = service.createDraft(minimal("PM"), null);
        assertThatThrownBy(() -> service.unpublish(draft.id(), null))
                .isInstanceOf(JobException.class)
                .hasFieldOrPropertyWithValue("code", JobErrorCodes.INVALID_STATE_TRANSITION);
    }

    @Test
    void closeIsIdempotent() {
        Job draft = service.createDraft(minimal("SRE"), null);
        Job published = service.publish(draft.id(), null);
        Job closed = service.close(published.id(), null);
        assertThat(closed.status()).isEqualTo(JobStatus.CLOSED);
        assertThat(closed.closedAt()).isNotNull();
        Job closedAgain = service.close(closed.id(), null);
        assertThat(closedAgain.status()).isEqualTo(JobStatus.CLOSED);
    }

    @Test
    void cloneCreatesDraftCopy() {
        Job draft = service.createDraft(minimal("Data Engineer"), null);
        Job published = service.publish(draft.id(), null);

        Job clone = service.clone(published.id(), null);
        assertThat(clone.id()).isNotEqualTo(published.id());
        assertThat(clone.status()).isEqualTo(JobStatus.DRAFT);
        assertThat(clone.title()).isEqualTo(published.title() + " (copy)");
        assertThat(clone.tenantId()).isEqualTo(TENANT_A);
    }

    @Test
    void crossTenantReadIsBlocked() {
        Job draft = service.createDraft(minimal("Manager"), null);
        TenantContext.setCurrentTenant(TENANT_B);
        assertThat(service.get(draft.id())).isEmpty();
    }

    @Test
    void crossTenantUpdateIsBlocked() {
        Job draft = service.createDraft(minimal("Recruiter"), null);
        TenantContext.setCurrentTenant(TENANT_B);
        assertThatThrownBy(
                        () ->
                                service.updateJob(
                                        draft.id(),
                                        new JobInput(
                                                "Hijack",
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null),
                                        null))
                .isInstanceOf(JobException.class)
                .hasFieldOrPropertyWithValue("code", JobErrorCodes.JOB_NOT_FOUND);
    }

    private static JobInput minimal(String title) {
        return new JobInput(
                title,
                "Engineering",
                "Build a thing.",
                "Own roadmap",
                "Spring + Postgres",
                "FULL_TIME",
                "REMOTE",
                3,
                7,
                12000000L,
                18000000L,
                "USD",
                "Remote",
                null,
                null,
                "US",
                null,
                null,
                List.of("java", "spring"));
    }
}
