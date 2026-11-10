package com.jobocate.job.infrastructure.config;

import com.jobocate.platform.security.JobocateSecurityProperties;
import com.jobocate.platform.security.JobocateSecuritySupport;
import com.jobocate.platform.security.Role;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            @Value("${jobocate.security.jwt-secret}") String jwtSecret,
            @Value("${jobocate.security.allow-dev-tenant-header:false}") boolean allowDevHeader,
            @Value("${jobocate.internal-token:jobocate-internal-dev-token}") String internalToken)
            throws Exception {
        JobocateSecurityProperties props =
                new JobocateSecurityProperties(jwtSecret, allowDevHeader, internalToken, null);
        JobocateSecuritySupport.applyDefaults(http, props);
        http.authorizeHttpRequests(
                reg ->
                        reg.requestMatchers("/actuator/**", "/error")
                                .permitAll()
                                .requestMatchers("/internal/**")
                                .hasRole(Role.SUPER_ADMIN.name())
                                // Job CRUD is tenant-scoped, so even GETs require an
                                // authenticated principal. The public marketplace
                                // browses jobs via the search-gateway, not this
                                // service.
                                .requestMatchers("/api/v1/jobs/*/publish",
                                        "/api/v1/jobs/*/unpublish",
                                        "/api/v1/jobs/*/close",
                                        "/api/v1/jobs/*/clone")
                                .hasAnyRole(
                                        Role.RECRUITER.name(),
                                        Role.HIRING_MANAGER.name(),
                                        Role.TENANT_ADMIN.name(),
                                        Role.SUPER_ADMIN.name())
                                .requestMatchers(
                                        org.springframework.http.HttpMethod.POST,
                                        "/api/v1/jobs",
                                        "/api/v1/jobs/**")
                                .hasAnyRole(
                                        Role.RECRUITER.name(),
                                        Role.HIRING_MANAGER.name(),
                                        Role.TENANT_ADMIN.name(),
                                        Role.SUPER_ADMIN.name())
                                .requestMatchers(
                                        org.springframework.http.HttpMethod.PATCH,
                                        "/api/v1/jobs/**")
                                .hasAnyRole(
                                        Role.RECRUITER.name(),
                                        Role.HIRING_MANAGER.name(),
                                        Role.TENANT_ADMIN.name(),
                                        Role.SUPER_ADMIN.name())
                                .anyRequest()
                                .authenticated());
        return http.build();
    }
}
