package com.jobocate.atscore.application;

import com.jobocate.atscore.infrastructure.persistence.TenantEntity;
import com.jobocate.atscore.infrastructure.persistence.TenantJpaRepository;
import com.jobocate.platform.tenant.TenantContext;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TenantQueryService {

    private final TenantJpaRepository tenants;

    public TenantQueryService(TenantJpaRepository tenants) {
        this.tenants = tenants;
    }

    @Transactional(readOnly = true)
    public Optional<TenantEntity> current() {
        UUID tenantId = TenantContext.requireTenant();
        return tenants.findById(tenantId);
    }

    @Transactional(readOnly = true)
    public Optional<TenantEntity> bySlug(String slug) {
        return tenants.findBySlug(slug);
    }
}
