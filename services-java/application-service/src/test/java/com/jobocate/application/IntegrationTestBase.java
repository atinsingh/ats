package com.jobocate.application;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Boots a PostgreSQL container once per test class and disables Kafka /
 * outbox publisher / security for isolation. Concrete subclasses run any
 * needed authn/authz tests separately.
 */
@SpringBootTest(
        classes = ApplicationServiceApplication.class,
        properties = {
            "spring.kafka.bootstrap-servers=PLAINTEXT://localhost:1",
            "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration",
            "jobocate.outbox.publisher.enabled=false",
            "jobocate.security.allow-dev-tenant-header=true"
        })
public abstract class IntegrationTestBase {

    // One container for the whole test run. Spring caches the context across test classes, so a
    // per-class container would leave later classes pointing at a stopped database.
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
