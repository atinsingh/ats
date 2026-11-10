package com.jobocate.platform.security;

import java.util.List;

/**
 * Plain-record bundle of the values used by {@link JobocateSecuritySupport}.
 * Built per-request by each service's {@code SecurityConfig} (or the shared
 * {@link JobocateSecurityAutoConfiguration}) so we don't have to standardise
 * on a single yml shape across services that already shipped one.
 */
public record JobocateSecurityProperties(
        String jwtSecret,
        boolean allowDevTenantHeader,
        String internalToken,
        Cors cors) {

    public JobocateSecurityProperties {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            jwtSecret = "jobocate-local-jwt-secret-change-me!!!";
        }
        if (internalToken == null || internalToken.isBlank()) {
            internalToken = "jobocate-internal-dev-token";
        }
        if (cors == null) {
            cors = new Cors(List.of("http://localhost:3000", "http://localhost:3001"), false);
        }
    }

    public record Cors(List<String> allowedOrigins, boolean allowCredentials) {

        public Cors {
            if (allowedOrigins == null) {
                allowedOrigins = List.of();
            }
        }
    }
}
