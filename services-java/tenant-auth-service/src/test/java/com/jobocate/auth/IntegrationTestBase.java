package com.jobocate.auth;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/** Boots one PostgreSQL container for the whole run, with the dev tenant header allowed. */
@SpringBootTest(
        classes = TenantAuthServiceApplication.class,
        properties = {"jobocate.security.allow-dev-tenant-header=true"})
public abstract class IntegrationTestBase {

    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("jobocate_test")
                    .withUsername("jobocate")
                    .withPassword("jobocate");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void dataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
