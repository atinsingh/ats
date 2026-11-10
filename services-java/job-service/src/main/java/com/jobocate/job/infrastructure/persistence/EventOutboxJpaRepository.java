package com.jobocate.job.infrastructure.persistence;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventOutboxJpaRepository extends JpaRepository<EventOutboxEntity, UUID> {

    @Query(
            "select e from EventOutboxEntity e "
                    + "where e.status in ("
                    + "    com.jobocate.job.infrastructure.persistence.EventOutboxEntity.OutboxStatus.PENDING,"
                    + "    com.jobocate.job.infrastructure.persistence.EventOutboxEntity.OutboxStatus.FAILED) "
                    + "  and e.nextAttemptAt <= :now "
                    + "order by e.nextAttemptAt asc")
    List<EventOutboxEntity> findDue(@Param("now") Instant now, Pageable pageable);
}
