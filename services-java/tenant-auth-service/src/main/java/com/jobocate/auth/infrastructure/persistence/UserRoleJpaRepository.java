package com.jobocate.auth.infrastructure.persistence;

import com.jobocate.platform.security.Role;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRoleJpaRepository extends JpaRepository<UserRoleEntity, UUID> {

    List<UserRoleEntity> findByUserIdAndRevokedAtIsNull(UUID userId);

    List<UserRoleEntity> findByUserIdAndTenantIdAndRevokedAtIsNull(UUID userId, UUID tenantId);

    boolean existsByUserIdAndTenantIdAndRoleAndRevokedAtIsNull(
            UUID userId, UUID tenantId, Role role);
}
