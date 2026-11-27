package com.jobocate.application.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobocate.application.IntegrationTestBase;
import com.jobocate.application.api.ApplicationController.ChangeStatusRequest;
import com.jobocate.application.api.ApplicationController.CreateApplicationRequest;
import com.jobocate.application.infrastructure.persistence.ApplicationStatus;
import com.jobocate.platform.security.TenantIdentityFilter;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class JobApplicationsControllerTest extends IntegrationTestBase {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String apply(UUID tenant, UUID job) throws Exception {
        CreateApplicationRequest req =
                new CreateApplicationRequest(job, UUID.randomUUID(), null, null);
        String body =
                mvc.perform(
                                post("/api/v1/applications")
                                        .header(
                                                TenantIdentityFilter.DEV_TENANT_HEADER,
                                                tenant.toString())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(json.writeValueAsBytes(req)))
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    @Test
    void listsOnlyThatJobsApplicationsNewestFirst() throws Exception {
        UUID tenant = UUID.randomUUID();
        UUID job = UUID.randomUUID();
        String first = apply(tenant, job);
        String second = apply(tenant, job);
        apply(tenant, UUID.randomUUID());

        mvc.perform(
                        get("/api/v1/jobs/{jobId}/applications", job)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(second))
                .andExpect(jsonPath("$[1].id").value(first))
                .andExpect(jsonPath("$[0].jobId").value(job.toString()));
    }

    @Test
    void anotherTenantSeesNothingForTheSameJob() throws Exception {
        UUID job = UUID.randomUUID();
        apply(UUID.randomUUID(), job);

        mvc.perform(
                        get("/api/v1/jobs/{jobId}/applications", job)
                                .header(
                                        TenantIdentityFilter.DEV_TENANT_HEADER,
                                        UUID.randomUUID().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void filtersByStatusAndCapsTheLimit() throws Exception {
        UUID tenant = UUID.randomUUID();
        UUID job = UUID.randomUUID();
        String screened = apply(tenant, job);
        apply(tenant, job);
        mvc.perform(
                        post("/api/v1/applications/{id}/status", screened)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsBytes(
                                                new ChangeStatusRequest(
                                                        ApplicationStatus.SCREENING, null))))
                .andExpect(status().isOk());

        mvc.perform(
                        get("/api/v1/jobs/{jobId}/applications", job)
                                .param("status", "SCREENING")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(screened));

        mvc.perform(
                        get("/api/v1/jobs/{jobId}/applications", job)
                                .param("limit", "100000")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void aCandidateCannotListAJobsApplications() throws Exception {
        mvc.perform(
                        get("/api/v1/jobs/{jobId}/applications", UUID.randomUUID())
                                .header(
                                        TenantIdentityFilter.DEV_TENANT_HEADER,
                                        UUID.randomUUID().toString())
                                .header(TenantIdentityFilter.DEV_ROLES_HEADER, "CANDIDATE"))
                .andExpect(status().isForbidden());
    }
}
