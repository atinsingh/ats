package com.jobocate.auth.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable());
        http.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        // The auth service is the issuer. It cannot enforce JWT verification on
        // its own login endpoints, so the only public surface is `/api/auth/**`
        // and `/actuator/**`. Everything else is reserved for future
        // authenticated admin operations.
        http.authorizeHttpRequests(
                reg ->
                        reg.requestMatchers("/actuator/**", "/api/auth/**", "/error")
                                .permitAll()
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
