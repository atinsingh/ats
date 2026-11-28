package com.jobocate.auth.infrastructure.config;

import com.jobocate.platform.security.JobocateSecurityProperties;
import com.jobocate.platform.security.JobocateSecuritySupport;
import com.jobocate.platform.security.Role;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            @Value("${jobocate.security.jwt-secret}") String jwtSecret,
            @Value("${jobocate.security.allow-dev-tenant-header:false}") boolean allowDevHeader,
            @Value("${jobocate.internal-token:jobocate-internal-dev-token}") String internalToken)
            throws Exception {
        // The auth service is the issuer, so its login endpoints stay public. Tenant-scoped reads
        // such as the colleague list use the same trusted identity filters as every other service.
        JobocateSecuritySupport.applyDefaults(
                http, new JobocateSecurityProperties(jwtSecret, allowDevHeader, internalToken, null));
        http.authorizeHttpRequests(
                reg ->
                        reg.requestMatchers("/actuator/**", "/api/auth/**", "/error")
                                .permitAll()
                                .requestMatchers("/api/v1/colleagues")
                                .hasAnyRole(
                                        Role.RECRUITER.name(),
                                        Role.HIRING_MANAGER.name(),
                                        Role.TENANT_ADMIN.name(),
                                        Role.SUPER_ADMIN.name())
                                .anyRequest()
                                .denyAll());
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        // BCrypt with strength=12 — slow enough to mitigate brute-force, fast
        // enough to keep login latency reasonable on commodity hardware.
        return new BCryptPasswordEncoder(12);
    }
}
