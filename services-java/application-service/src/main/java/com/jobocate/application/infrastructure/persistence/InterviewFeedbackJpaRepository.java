package com.jobocate.application.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewFeedbackJpaRepository
        extends JpaRepository<InterviewFeedbackEntity, UUID> {

    List<InterviewFeedbackEntity> findByTenantIdAndInterviewIdOrderBySubmittedAtAsc(
            UUID tenantId, UUID interviewId);
}
