package com.jobocate.job.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobocate.job.IntegrationTestBase;
import com.jobocate.job.api.JobController.CreateJobRequest;
import com.jobocate.platform.security.TenantIdentityFilter;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class JobControllerTest extends IntegrationTestBase {

    private static final UUID TENANT = UUID.fromString("00000000-0000-0000-0000-00000000bbbb");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void createDraftReturns201() throws Exception {
        CreateJobRequest req =
                new CreateJobRequest(
                        "Platform Engineer",
                        "Engineering",
                        "Build core platform",
                        "Own services",
                        "Java + Spring",
                        "FULL_TIME",
                        "REMOTE",
                        3,
                        7,
                        15000000L,
                        20000000L,
                        "USD",
                        "Remote",
                        null,
                        null,
                        "US",
                        null,
                        null,
                        List.of("java"));
        mvc.perform(
                        post("/api/v1/jobs")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, TENANT.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsBytes(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.tenantId").value(TENANT.toString()));
    }

    @Test
    void publishWithoutRequiredFieldsReturns422() throws Exception {
        CreateJobRequest req =
                new CreateJobRequest(
                        "Title only",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of());
        var created =
                mvc.perform(
                                post("/api/v1/jobs")
                                        .header(
                                                TenantIdentityFilter.DEV_TENANT_HEADER,
                                                TENANT.toString())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(json.writeValueAsBytes(req)))
                        .andExpect(status().isCreated())
                        .andReturn();
        String id = json.readTree(created.getResponse().getContentAsString()).get("id").asText();

        mvc.perform(
                        post("/api/v1/jobs/{id}/publish", id)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, TENANT.toString()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("JOB_NOT_PUBLISHABLE"));
    }

    @Test
    void getReturns404ForOtherTenant() throws Exception {
        UUID tenantA = UUID.fromString("00000000-0000-0000-0000-00000000ccc1");
        UUID tenantB = UUID.fromString("00000000-0000-0000-0000-00000000ccc2");
        CreateJobRequest req =
                new CreateJobRequest(
                        "DevRel",
                        null,
                        "desc",
                        null,
                        null,
                        "FULL_TIME",
                        "REMOTE",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of());
        var created =
                mvc.perform(
                                post("/api/v1/jobs")
                                        .header(
                                                TenantIdentityFilter.DEV_TENANT_HEADER,
                                                tenantA.toString())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(json.writeValueAsBytes(req)))
                        .andExpect(status().isCreated())
                        .andReturn();
        String id = json.readTree(created.getResponse().getContentAsString()).get("id").asText();

        mvc.perform(
                        get("/api/v1/jobs/{id}", id)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenantB.toString()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("JOB_NOT_FOUND"));
    }
}
