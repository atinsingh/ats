package com.jobocate.candidate.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jobocate.candidate.IntegrationTestBase;
import com.jobocate.candidate.infrastructure.persistence.CandidateJpaRepository;
import com.jobocate.candidate.infrastructure.persistence.CandidateProfileEntity;
import com.jobocate.platform.security.TenantIdentityFilter;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@AutoConfigureMockMvc
class TalentSearchControllerTest extends IntegrationTestBase {

    @Autowired MockMvc mvc;
    @Autowired CandidateJpaRepository candidates;

    private CandidateProfileEntity save(
            UUID tenant, String name, String headline, String summary, boolean searchable) {
        CandidateProfileEntity c = new CandidateProfileEntity();
        c.setId(UUID.randomUUID());
        c.setTenantId(tenant);
        c.setFullName(name);
        c.setEmail(UUID.randomUUID() + "@example.test");
        c.setHeadline(headline);
        c.setSummary(summary);
        c.setConsentSearchable(searchable);
        return candidates.saveAndFlush(c);
    }

    private ResultActions search(UUID tenant, String body) throws Exception {
        return mvc.perform(
                post("/api/v1/candidates/search")
                        .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body));
    }

    private static final String JAVA_KAFKA =
            "{\"titles\":[\"java developer\",\"backend engineer\"],"
                    + "\"skills\":[[\"spring boot\",\"springboot\"],[\"kafka\"]],"
                    + "\"exclude\":[\"intern\"]}";

    @Test
    void ranksSearchableCandidatesByMustHavesFound() throws Exception {
        UUID tenant = UUID.randomUUID();
        save(tenant, "All Three", "Senior Java Developer", "Spring Boot and Kafka", true);
        save(tenant, "Two Of Three", "Backend Engineer", "Spring Boot services", true);
        save(tenant, "Not Searchable", "Java Developer", "Spring Boot and Kafka", false);
        save(tenant, "Excluded", "Java developer intern", "Spring Boot and Kafka", true);
        save(tenant, "No Match", "Office manager", "Scheduling", true);
        save(UUID.randomUUID(), "Other Tenant", "Java Developer", "Spring Boot and Kafka", true);

        search(tenant, JAVA_KAFKA)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].fullName").value("All Three"))
                .andExpect(jsonPath("$[0].found").value(3))
                .andExpect(jsonPath("$[0].of").value(3))
                .andExpect(jsonPath("$[1].fullName").value("Two Of Three"))
                .andExpect(jsonPath("$[1].found").value(2));
    }

    @Test
    void anEmptyQueryFindsNobody() throws Exception {
        UUID tenant = UUID.randomUUID();
        save(tenant, "Anyone", "Java Developer", null, true);
        search(tenant, "{\"titles\":[\" \"],\"skills\":[[]]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void candidatesCannotSearch() throws Exception {
        mvc.perform(
                        post("/api/v1/candidates/search")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, UUID.randomUUID().toString())
                                .header(TenantIdentityFilter.DEV_ROLES_HEADER, "CANDIDATE")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(JAVA_KAFKA))
                .andExpect(status().isForbidden());
    }
}
