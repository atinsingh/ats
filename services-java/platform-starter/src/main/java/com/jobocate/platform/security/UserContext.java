package com.jobocate.platform.security;

import java.util.UUID;

/**
 * Request-scoped user identity mirror of {@link com.jobocate.platform.tenant.TenantContext}.
 *
 * <p>Populated by {@link TenantIdentityFilter} (or {@link InternalTokenFilter}
 * for service-to-service requests) and consumed by services that need to set
 * {@code created_by_user_id} / {@code updated_by_user_id} columns without
 * pulling Spring Security types into the application layer.
 *
 * <p>Always paired with {@link #clear()} in a {@code finally} block to avoid
 * leaking ThreadLocals between requests.
 */
public final class UserContext {

    private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

    private UserContext() {}

    public static void setCurrentUser(UUID userId) {
        CURRENT.set(userId);
    }

    public static UUID currentUserOrNull() {
        return CURRENT.get();
    }

    public static void clear() {
        CURRENT.remove();
    }
}
