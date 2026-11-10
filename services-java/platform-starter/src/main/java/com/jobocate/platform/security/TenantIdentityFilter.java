package com.jobocate.platform.security;

import com.jobocate.platform.tenant.MissingTenantException;
import com.jobocate.platform.tenant.TenantContext;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Resolves {@link TenantContext}, {@link UserContext}, and a Spring Security
 * {@link JobocateAuthentication} from a verified JWT or, when explicitly
 * enabled, the development-only headers ({@code X-Jobocate-Tenant-Id},
 * {@code X-Jobocate-User-Id}, {@code X-Jobocate-Roles}).
 *
 * <p>Header-based identity must never be enabled in production
 * ({@code jobocate.security.allow-dev-tenant-header=false}).
 */
public class TenantIdentityFilter extends OncePerRequestFilter {

    public static final String DEV_TENANT_HEADER = "X-Jobocate-Tenant-Id";
    public static final String DEV_USER_HEADER = "X-Jobocate-User-Id";
    public static final String DEV_ROLES_HEADER = "X-Jobocate-Roles";

    private final SecretKey jwtSecret;
    private final boolean allowDevTenantHeader;

    public TenantIdentityFilter(byte[] jwtSecret, boolean allowDevTenantHeader) {
        this.jwtSecret = Keys.hmacShaKeyFor(padHmacSecret(jwtSecret));
        this.allowDevTenantHeader = allowDevTenantHeader;
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        // Actuator, internal, and (auth-issuing) public auth routes bypass tenant resolution.
        return path.startsWith("/actuator")
                || path.startsWith("/internal/")
                || path.startsWith("/api/auth/");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        try {
            ResolvedIdentity id = resolve(request);
            TenantContext.setCurrentTenant(id.tenantId());
            UserContext.setCurrentUser(id.userId());
            SecurityContextHolder.getContext()
                    .setAuthentication(
                            new JobocateAuthentication(id.userId(), id.tenantId(), id.roles()));
            filterChain.doFilter(request, response);
        } catch (MissingTenantException ex) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, ex.getMessage());
        } catch (JwtException | IllegalArgumentException ex) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid tenant credentials");
        } finally {
            TenantContext.clear();
            UserContext.clear();
            SecurityContextHolder.clearContext();
        }
    }

    private ResolvedIdentity resolve(HttpServletRequest request) {
        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (auth != null && auth.regionMatches(true, 0, "Bearer ", 0, "Bearer ".length())) {
            String token = auth.substring("Bearer ".length()).trim();
            Claims claims =
                    Jwts.parser().verifyWith(jwtSecret).build().parseSignedClaims(token).getPayload();
            UUID tenantId = UUID.fromString(claims.get("tenant_id", String.class));
            UUID userId = parseUuid(claims.getSubject());
            Set<Role> roles = parseRoles(claims.get("roles"));
            return new ResolvedIdentity(tenantId, userId, roles);
        }
        if (allowDevTenantHeader) {
            String header = request.getHeader(DEV_TENANT_HEADER);
            if (header != null && !header.isBlank()) {
                UUID tenantId = UUID.fromString(header.trim());
                UUID userId = parseUuid(request.getHeader(DEV_USER_HEADER));
                String rolesHeader = request.getHeader(DEV_ROLES_HEADER);
                // Dev convenience: when the operator hasn't pinned a role set we
                // grant every role so curl/test flows don't have to know which
                // role each route needs. Production has dev mode off entirely.
                Set<Role> roles =
                        (rolesHeader == null || rolesHeader.isBlank())
                                ? EnumSet.allOf(Role.class)
                                : parseRolesHeader(rolesHeader);
                return new ResolvedIdentity(tenantId, userId, roles);
            }
        }
        throw new MissingTenantException("Missing bearer token");
    }

    private static UUID parseUuid(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return UUID.fromString(s.trim());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private static Set<Role> parseRoles(Object rolesClaim) {
        if (rolesClaim == null) return Set.of();
        if (rolesClaim instanceof List<?> list) {
            EnumSet<Role> out = EnumSet.noneOf(Role.class);
            for (Object o : list) {
                Role r = roleOrNull(String.valueOf(o));
                if (r != null) out.add(r);
            }
            return out;
        }
        if (rolesClaim instanceof String s) {
            return parseRolesHeader(s);
        }
        return Set.of();
    }

    private static Set<Role> parseRolesHeader(String header) {
        if (header == null || header.isBlank()) return Set.of();
        EnumSet<Role> out = EnumSet.noneOf(Role.class);
        for (String chunk : header.split(",")) {
            Role r = roleOrNull(chunk.trim());
            if (r != null) out.add(r);
        }
        return out;
    }

    private static Role roleOrNull(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Role.valueOf(s.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    /**
     * HS256 requires a key of sufficient length; pad short dev secrets deterministically for local DX.
     */
    private static byte[] padHmacSecret(byte[] secret) {
        if (secret.length >= 32) {
            return secret;
        }
        byte[] padded = new byte[32];
        System.arraycopy(secret, 0, padded, 0, Math.min(secret.length, 32));
        for (int i = secret.length; i < 32; i++) {
            padded[i] = (byte) i;
        }
        return padded;
    }

    public static byte[] devSecret() {
        return "jobocate-local-jwt-secret-change-me!!!".getBytes(StandardCharsets.UTF_8);
    }

    private record ResolvedIdentity(UUID tenantId, UUID userId, Set<Role> roles) {}
}
