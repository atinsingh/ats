package com.jobocate.platform.tenant;

import java.util.UUID;

/**
 * Request-scoped tenant identity resolved server-side (JWT or controlled dev header).
 * Always {@link #clear()} at the end of the request to avoid leaking ThreadLocals.
 */
public final class TenantContext {

    private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

    private TenantContext() {}

    public static void setCurrentTenant(UUID tenantId) {
        CURRENT.set(tenantId);
    }

    public static UUID currentTenantOrNull() {
        return CURRENT.get();
    }

    public static UUID requireTenant() {
        UUID id = CURRENT.get();
        if (id == null) {
            throw new MissingTenantException("No tenant in security context for this request");
        }
        return id;
    }

    public static void clear() {
        CURRENT.remove();
    }
}
