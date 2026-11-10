package com.jobocate.platform.security;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/**
 * Spring Security {@link org.springframework.security.core.Authentication}
 * built from a verified Jobocate JWT (or, in dev, from the trusted dev
 * headers handled by {@link TenantIdentityFilter}).
 *
 * <p>Carries the three things every controller needs:
 *
 * <ul>
 *   <li>{@code tenantId} — already mirrored into {@link com.jobocate.platform.tenant.TenantContext}.
 *   <li>{@code userId}   — the {@code sub} claim, mirrored into {@link UserContext}.
 *   <li>{@code roles}    — translated to Spring authorities of the form
 *       {@code ROLE_RECRUITER}, {@code ROLE_TENANT_ADMIN}, etc.
 * </ul>
 *
 * <p>{@link #getPrincipal()} returns the {@link UUID} user id so controllers
 * can use {@code @AuthenticationPrincipal UUID userId}.
 */
public final class JobocateAuthentication extends AbstractAuthenticationToken {

    private static final long serialVersionUID = 1L;

    private final UUID userId;
    private final UUID tenantId;
    private final Set<Role> roles;

    public JobocateAuthentication(UUID userId, UUID tenantId, Set<Role> roles) {
        super(toAuthorities(roles));
        this.userId = userId;
        this.tenantId = tenantId;
        this.roles = Set.copyOf(roles == null ? Set.of() : roles);
        // The principal is fully verified by the time the filter constructs us.
        setAuthenticated(true);
    }

    @Override
    public Object getPrincipal() {
        return userId;
    }

    @Override
    public Object getCredentials() {
        // The bearer token is already validated and discarded; nothing to expose downstream.
        return "";
    }

    public UUID userId() {
        return userId;
    }

    public UUID tenantId() {
        return tenantId;
    }

    public Set<Role> roles() {
        return roles;
    }

    public boolean hasRole(Role role) {
        return roles.contains(role);
    }

    private static Collection<? extends GrantedAuthority> toAuthorities(Set<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            return List.of();
        }
        return roles.stream()
                .map(r -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + r.name()))
                .toList();
    }

    /**
     * Synthetic principal used by {@link InternalTokenFilter} when an internal
     * service-to-service request is authenticated by the static
     * {@code jobocate.internal-token}. It carries no tenant scope; callers
     * must supply tenant scope explicitly via headers.
     */
    public static JobocateAuthentication internal() {
        return new JobocateAuthentication(null, null, Set.of(Role.SUPER_ADMIN));
    }
}
