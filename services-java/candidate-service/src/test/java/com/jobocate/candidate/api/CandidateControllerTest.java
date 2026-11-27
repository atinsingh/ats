package com.jobocate.candidate.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jobocate.candidate.IntegrationTestBase;
import com.jobocate.candidate.infrastructure.persistence.CandidateJpaRepository;
import com.jobocate.candidate.infrastructure.persistence.CandidateProfileEntity;
import com.jobocate.platform.security.TenantIdentityFilter;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class CandidateControllerTest extends IntegrationTestBase {

    private static final UUID TENANT = UUID.fromString("00000000-0000-0000-0000-00000000aaaa");
    private static final UUID OTHER_TENANT =
            UUID.fromString("00000000-0000-0000-0000-00000000bbbb");

    @Autowired MockMvc mvc;
    @Autowired CandidateJpaRepository candidates;

    private CandidateProfileEntity save(UUID tenant, String name) {
        CandidateProfileEntity c = new CandidateProfileEntity();
        c.setId(UUID.randomUUID());
        c.setTenantId(tenant);
        c.setFullName(name);
        c.setEmail(UUID.randomUUID() + "@example.test");
        c.setHeadline("Senior Java developer");
        c.setLocationCity("Toronto");
        return candidates.saveAndFlush(c);
    }

    @Test
    void getReturnsTheTenantsCandidate() throws Exception {
        CandidateProfileEntity c = save(TENANT, "Sample Person");

        mvc.perform(
                        get("/api/v1/candidates/{id}", c.getId())
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, TENANT.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(c.getId().toString()))
                .andExpect(jsonPath("$.fullName").value("Sample Person"))
                .andExpect(jsonPath("$.headline").value("Senior Java developer"))
                .andExpect(jsonPath("$.locationCity").value("Toronto"));
    }

    @Test
    void anotherTenantsCandidateIsNotFound() throws Exception {
        CandidateProfileEntity c = save(OTHER_TENANT, "Other Tenant Person");

        mvc.perform(
                        get("/api/v1/candidates/{id}", c.getId())
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, TENANT.toString()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("CANDIDATE_NOT_FOUND"));
    }

    @Test
    void deletedCandidateIsNotFound() throws Exception {
        CandidateProfileEntity c = save(TENANT, "Deleted Person");
        c.markDeleted(Instant.now());
        candidates.saveAndFlush(c);

        mvc.perform(
                        get("/api/v1/candidates/{id}", c.getId())
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, TENANT.toString()))
                .andExpect(status().isNotFound());
    }

    @Test
    void missingTenantIsRejected() throws Exception {
        mvc.perform(get("/api/v1/candidates/{id}", UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }
}
