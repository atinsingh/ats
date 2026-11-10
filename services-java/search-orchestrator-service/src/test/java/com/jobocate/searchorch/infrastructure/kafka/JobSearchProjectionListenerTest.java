package com.jobocate.searchorch.infrastructure.kafka;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class JobSearchProjectionListenerTest {

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void buildIndexDocument_mapsOutboxFields() throws Exception {
        JobSearchProjectionListener l = newListener();
        var node =
                json.readTree(
                        "{"
                                + "\"type\":\"job.published\","
                                + "\"tenant_id\":\"t1\",\"job_id\":\"j1\",\"title\":\"Engineer\","
                                + "\"status\":\"PUBLISHED\",\"slug\":\"engineer-1\","
                                + "\"description\":\"do things\",\"employment_type\":\"FULL_TIME\","
                                + "\"remote_policy\":\"REMOTE_FIRST\","
                                + "\"location\":\"Remote\",\"location_country\":\"US\","
                                + "\"location_region\":\"CA\",\"location_city\":\"SF\","
                                + "\"currency_code\":\"USD\",\"salary_min_cents\":12000000,"
                                + "\"salary_max_cents\":18000000,"
                                + "\"experience_min_years\":3,\"experience_max_years\":7,"
                                + "\"boost_score\":0,"
                                + "\"skills\":[\"Java\",\"Go\"],"
                                + "\"published_at\":\"2026-05-13T18:00:00Z\""
                                + "}");
        Map<String, Object> doc = l.buildIndexDocument(node);
        assertThat(doc).isNotNull();
        assertThat(doc.get("tenant_id")).isEqualTo("t1");
        assertThat(doc.get("job_id")).isEqualTo("j1");
        assertThat(doc.get("title")).isEqualTo("Engineer");
        assertThat(doc.get("status")).isEqualTo("PUBLISHED");
        assertThat(doc.get("country")).isEqualTo("US");
        assertThat(doc.get("region")).isEqualTo("CA");
        assertThat(doc.get("city")).isEqualTo("SF");
        assertThat(doc.get("currency")).isEqualTo("USD");
        assertThat(doc.get("currency_code")).isEqualTo("USD");
        assertThat(doc.get("description_text")).isEqualTo("do things");
        assertThat(doc.get("salary_min_cents")).isEqualTo(12000000L);
        assertThat(doc.get("experience_max_years")).isEqualTo(7);
        @SuppressWarnings("unchecked")
        List<String> skills = (List<String>) doc.get("skills");
        assertThat(skills).containsExactly("java", "go");
    }

    @Test
    void buildIndexDocument_returnsNullForMissingRequired() throws Exception {
        JobSearchProjectionListener l = newListener();
        var node = json.readTree("{\"type\":\"job.published\",\"tenant_id\":\"t1\"}");
        assertThat(l.buildIndexDocument(node)).isNull();
    }

    @Test
    void buildIndexDocument_translatesLegacyOpenStatus() throws Exception {
        JobSearchProjectionListener l = newListener();
        var node =
                json.readTree(
                        "{\"type\":\"JOB_UPSERTED\",\"tenant_id\":\"t1\",\"job_id\":\"j1\","
                                + "\"title\":\"Engineer\",\"status\":\"OPEN\"}");
        Map<String, Object> doc = l.buildIndexDocument(node);
        assertThat(doc).isNotNull();
        assertThat(doc.get("status")).isEqualTo("PUBLISHED");
    }

    @Test
    void buildIndexDocument_rejectsUnknownStatus() throws Exception {
        JobSearchProjectionListener l = newListener();
        var node =
                json.readTree(
                        "{\"type\":\"job.published\",\"tenant_id\":\"t1\",\"job_id\":\"j1\","
                                + "\"title\":\"Engineer\",\"status\":\"PENDING_REVIEW\"}");
        assertThat(l.buildIndexDocument(node)).isNull();
    }

    private JobSearchProjectionListener newListener() {
        // Pure mapper test — RestClient is never invoked.
        RestClient client = RestClient.builder().baseUrl("http://localhost:65535").build();
        return new JobSearchProjectionListener(client, json, "tok", new SimpleMeterRegistry());
    }
}
