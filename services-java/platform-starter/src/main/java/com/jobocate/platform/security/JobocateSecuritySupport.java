package com.jobocate.platform.security;

import com.jobocate.platform.observability.RequestLoggingFilter;
import java.nio.charset.StandardCharsets;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Shared Spring Security wiring used by every Jobocate service.
 *
 * <p>Each service has its own {@code @Configuration class SecurityConfig} that
 * exposes a single {@link org.springframework.security.web.SecurityFilterChain}
 * by calling {@link #applyDefaults(HttpSecurity, JobocateSecurityProperties)} and
 * then layering its own {@code authorizeHttpRequests} rules on top.
 */
public final class JobocateSecuritySupport {

    private JobocateSecuritySupport() {}

    /**
     * Apply CSRF/session/CORS defaults plus the tenant + internal-token filters.
     * The caller adds {@code authorizeHttpRequests(...)} with the service's URL
     * rules and finishes the chain with {@code .build()}.
     */
    public static HttpSecurity applyDefaults(HttpSecurity http, JobocateSecurityProperties props)
            throws Exception {
        http.csrf(csrf -> csrf.disable());
        http.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        http.cors(cors -> cors.configurationSource(corsConfig(props)));

        http.addFilterBefore(
                new InternalTokenFilter(props.internalToken()),
                AnonymousAuthenticationFilter.class);
        http.addFilterBefore(
                new TenantIdentityFilter(
                        props.jwtSecret().getBytes(StandardCharsets.UTF_8),
                        props.allowDevTenantHeader()),
                AnonymousAuthenticationFilter.class);
        // Runs after the identity filters so the MDC copies the resolved
        // tenant + user.
        http.addFilterAfter(new RequestLoggingFilter(), AnonymousAuthenticationFilter.class);
        return http;
    }

    /**
     * Default URL ruleset that should fit most services. Mounts:
     *
     * <ul>
     *   <li>{@code /actuator/**}, {@code /api/auth/**} → permitAll
     *   <li>{@code /internal/**} → must be authenticated as
     *       {@link Role#SUPER_ADMIN} (i.e. through {@link InternalTokenFilter})
     *   <li>everything else → authenticated
     * </ul>
     */
    public static void defaultRules(
            AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry
                    reg) {
        reg.requestMatchers("/actuator/**", "/api/auth/**", "/error")
                .permitAll()
                .requestMatchers("/internal/**")
                .hasRole(Role.SUPER_ADMIN.name())
                .anyRequest()
                .authenticated();
    }

    private static UrlBasedCorsConfigurationSource corsConfig(JobocateSecurityProperties props) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOriginPatterns(props.cors().allowedOrigins());
        cors.addAllowedHeader("*");
        cors.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowCredentials(props.cors().allowCredentials());
        cors.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return source;
    }
}
