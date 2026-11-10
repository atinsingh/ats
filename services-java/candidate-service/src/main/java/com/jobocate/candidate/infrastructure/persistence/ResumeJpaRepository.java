package com.jobocate.candidate.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ResumeJpaRepository extends JpaRepository<ResumeEntity, UUID> {

    List<ResumeEntity> findByCandidateProfileIdOrderByCreatedAtDesc(UUID candidateProfileId);

    Optional<ResumeEntity> findByIdAndCandidateProfileId(UUID id, UUID candidateProfileId);

    @Modifying
    @Query("update ResumeEntity r set r.isDefault = false where r.candidateProfileId = :candidate")
    int clearDefaultFor(@Param("candidate") UUID candidateProfileId);
}
