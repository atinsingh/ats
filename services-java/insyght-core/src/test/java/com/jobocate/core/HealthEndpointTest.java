package com.jobocate.core;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** The app starts against Postgres and reports UP without credentials. */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "jobocate.security.jwt-secret=test-only-jwt-secret-at-least-32-bytes!!",
            "jobocate.internal-token=test-only-internal-token"
        })
@Testcontainers(disabledWithoutDocker = true)
class HealthEndpointTest {

    @Container
    static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:16-alpine")
                    .withDatabaseName("jobocate_test")
                    .withUsername("jobocate")
                    .withPassword("jobocate");

    @DynamicPropertySource
    static void dataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Value("${local.server.port}")
    int port;

    @Test
    void healthIsUp() throws Exception {
        HttpResponse<String> response =
                HttpClient.newHttpClient()
                        .send(
                                HttpRequest.newBuilder(
                                                URI.create("http://localhost:" + port + "/actuator/health"))
                                        .build(),
                                HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"status\":\"UP\"");
    }

    @Test
    void metricsNeedAuthentication() throws Exception {
        // Anonymous callers get 403 here (role rule) and 401 on plain authenticated paths.
        assertThat(get("/actuator/prometheus").statusCode()).isIn(401, 403);
    }

    @Test
    void apiNeedsAuthentication() throws Exception {
        assertThat(get("/api/v1/anything").statusCode()).isEqualTo(401);
    }

    private HttpResponse<String> get(String path) throws Exception {
        return HttpClient.newHttpClient()
                .send(
                        HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).build(),
                        HttpResponse.BodyHandlers.ofString());
    }
}
