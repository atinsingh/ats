package com.jobocate.core;

import com.jobocate.platform.security.JobocateSecurityProperties;
import com.jobocate.platform.security.JobocateSecuritySupport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * The single security chain for every module in insyght-core.
 *
 * <p>Modules add method-level rules ({@code @PreAuthorize}) on their own controllers. URL rules
 * stay here so there is one place to read what is public. Moving to OIDC resource-server
 * validation is IATS-147.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class CoreSecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            @Value("${jobocate.security.jwt-secret}") String jwtSecret,
            @Value("${jobocate.security.allow-dev-tenant-header:false}") boolean allowDevHeader,
            @Value("${jobocate.internal-token}") String internalToken)
            throws Exception {
        JobocateSecurityProperties props =
                new JobocateSecurityProperties(jwtSecret, allowDevHeader, internalToken, null);
        JobocateSecuritySupport.applyDefaults(http, props);
        http.authorizeHttpRequests(JobocateSecuritySupport::defaultRules);
        return http.build();
    }
}
