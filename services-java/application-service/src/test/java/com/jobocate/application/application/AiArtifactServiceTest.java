package com.jobocate.application.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jobocate.application.IntegrationTestBase;
import com.jobocate.application.application.AiArtifactService.RecordResultCommand;
import com.jobocate.application.application.AiArtifactService.RequestArtifactCommand;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class AiArtifactServiceTest extends IntegrationTestBase {

    @Autowired AiArtifactService service;
    @Autowired AiArtifactJpaRepository artifacts;
    @Autowired EventOutboxJpaRepository outbox;

    private static final UUID TENANT_A = UUID.fromString("11111111-0000-0000-0000-00000000000a");
    private static final UUID TENANT_B = UUID.fromString("11111111-0000-0000-0000-00000000000b");

    @BeforeEach
    void setTenant() {
        TenantContext.setCurrentTenant(TENANT_A);
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
        outbox.deleteAll();
        artifacts.deleteAll();
    }

    @Test
    void requestCreatesDraftAndEnqueuesRequestedEvent() {
        UUID candidate = UUID.randomUUID();
        UUID actor = UUID.randomUUID();

        AiArtifactEntity created = service.request(coverLetter(candidate, "key-1", actor));

        assertThat(created.getStatus()).isEqualTo(AiArtifactStatus.DRAFT);
        assertThat(created.isReviewRequired()).isTrue();
        assertThat(created.getRequestedByUserId()).isEqualTo(actor);
        assertThat(created.getTenantId()).isEqualTo(TENANT_A);
        List<EventOutboxEntity> events = outbox.findAll();
        assertThat(events).hasSize(1);
        assertThat(events.get(0).getEventType()).isEqualTo("ai.artifact.requested");
        assertThat(events.get(0).getTopic()).isEqualTo("jobocate.ai.artifact.events");
    }

    @Test
    void requestIsIdempotentOnIdempotencyKey() {
        UUID candidate = UUID.randomUUID();
        AiArtifactEntity first = service.request(coverLetter(candidate, "dup-key", UUID.randomUUID()));
        AiArtifactEntity second = service.request(coverLetter(candidate, "dup-key", UUID.randomUUID()));
        assertThat(second.getId()).isEqualTo(first.getId());
        assertThat(artifacts.count()).isEqualTo(1);
    }

    @Test
    void recordSuccessMovesToReadyForReviewWhenReviewRequired() {
        AiArtifactEntity created = service.request(coverLetter(UUID.randomUUID(), "k1", null));
        outbox.deleteAll();

        AiArtifactEntity updated =
                service.recordSuccess(
                        TENANT_A,
                        created.getId(),
                        new RecordResultCommand(
                                "Dear hiring team…", null, "gpt-x-2026-q2", "v3", null, null));
        assertThat(updated.getStatus()).isEqualTo(AiArtifactStatus.READY_FOR_REVIEW);
        assertThat(updated.getOutputText()).startsWith("Dear hiring");
        assertThat(updated.getModelVersion()).isEqualTo("gpt-x-2026-q2");
        assertThat(updated.getReadyAt()).isNotNull();
        assertThat(outbox.findAll())
                .extracting(EventOutboxEntity::getEventType)
                .containsExactly("ai.artifact.ready_for_review");
    }

    @Test
    void recordSuccessAutoApprovesRecruiterOnlyKinds() {
        // CANDIDATE_SUMMARY defaults to reviewRequired=false -> auto-approves
        UUID applicationId = UUID.randomUUID();
        AiArtifactEntity created =
                service.request(
                        new RequestArtifactCommand(
                                AiArtifactKind.CANDIDATE_SUMMARY,
                                AiArtifactSubjectType.APPLICATION,
                                applicationId,
                                applicationId,
                                null,
                                null,
                                "v1",
                                null,
                                Map.of(),
                                null,
                                "auto-1",
                                UUID.randomUUID(),
                                null));
        outbox.deleteAll();

        AiArtifactEntity updated =
                service.recordSuccess(
                        TENANT_A,
                        created.getId(),
                        new RecordResultCommand("3 yrs java + spring", null, "m1", "v1", null, null));
        assertThat(updated.getStatus()).isEqualTo(AiArtifactStatus.APPROVED);
        assertThat(updated.getApprovedAt()).isNotNull();
        assertThat(outbox.findAll())
                .extracting(EventOutboxEntity::getEventType)
                .containsExactly("ai.artifact.approved");
    }

    @Test
    void approveRequiresReadyForReviewState() {
        AiArtifactEntity created = service.request(coverLetter(UUID.randomUUID(), "k", null));
        assertThatThrownBy(() -> service.approve(created.getId(), UUID.randomUUID(), null))
                .isInstanceOfSatisfying(
                        ApplicationException.class,
                        ex ->
                                assertThat(ex.code())
                                        .isEqualTo(ApplicationErrorCodes.AI_ARTIFACT_NOT_REVIEWABLE));
    }

    @Test
    void approveTransitionsAndEnqueuesEvent() {
        AiArtifactEntity created = service.request(coverLetter(UUID.randomUUID(), "k", null));
        service.recordSuccess(
                TENANT_A,
                created.getId(),
                new RecordResultCommand("draft body", null, "m", "v", null, null));
        outbox.deleteAll();

        UUID approver = UUID.randomUUID();
        AiArtifactEntity approved = service.approve(created.getId(), approver, null);
        assertThat(approved.getStatus()).isEqualTo(AiArtifactStatus.APPROVED);
        assertThat(approved.getApprovedByUserId()).isEqualTo(approver);
        assertThat(outbox.findAll())
                .extracting(EventOutboxEntity::getEventType)
                .containsExactly("ai.artifact.approved");
    }

    @Test
    void recordFailureMovesToFailedAndEmitsEvent() {
        AiArtifactEntity created = service.request(coverLetter(UUID.randomUUID(), "k-fail", null));
        outbox.deleteAll();
        AiArtifactEntity failed =
                service.recordFailure(TENANT_A, created.getId(), "model timed out", null);
        assertThat(failed.getStatus()).isEqualTo(AiArtifactStatus.FAILED);
        assertThat(failed.getFailureReason()).isEqualTo("model timed out");
        assertThat(outbox.findAll())
                .extracting(EventOutboxEntity::getEventType)
                .containsExactly("ai.artifact.failed");
    }

    @Test
    void crossTenantLookupReturnsNotFound() {
        AiArtifactEntity created = service.request(coverLetter(UUID.randomUUID(), "k-tenant", null));

        TenantContext.setCurrentTenant(TENANT_B);
        assertThatThrownBy(() -> service.get(created.getId()))
                .isInstanceOfSatisfying(
                        ApplicationException.class,
                        ex ->
                                assertThat(ex.code())
                                        .isEqualTo(ApplicationErrorCodes.AI_ARTIFACT_NOT_FOUND));
    }

    private static RequestArtifactCommand coverLetter(UUID candidate, String key, UUID actor) {
        return new RequestArtifactCommand(
                AiArtifactKind.COVER_LETTER,
                AiArtifactSubjectType.CANDIDATE_PROFILE,
                candidate,
                null,
                null,
                null,
                "v1",
                "pending",
                Map.of("tone", "professional"),
                null,
                key,
                actor,
                null);
    }
}
