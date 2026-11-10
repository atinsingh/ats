package com.jobocate.candidate.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResumeParsedFieldsJpaRepository
        extends JpaRepository<ResumeParsedFieldsEntity, UUID> {

    Optional<ResumeParsedFieldsEntity> findByResumeId(UUID resumeId);
}
