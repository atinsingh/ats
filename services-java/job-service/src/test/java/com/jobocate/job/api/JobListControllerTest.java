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
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class JobListControllerTest extends IntegrationTestBase {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String draft(UUID tenant, String title) throws Exception {
        CreateJobRequest req =
                new CreateJobRequest(
                        title, null, "A description", null, null, "FULL_TIME", null, null, null,
                        null, null, null, null, null, null, null, null, null, List.of());
        String body =
                mvc.perform(
                                post("/api/v1/jobs")
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

    private void act(UUID tenant, String id, String action) throws Exception {
        mvc.perform(
                        post("/api/v1/jobs/{id}/" + action, id)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk());
    }

    /** One draft, one published and one closed job, created in that order. */
    private String[] seed(UUID tenant) throws Exception {
        String draft = draft(tenant, "Draft role");
        String published = draft(tenant, "Published role");
        act(tenant, published, "publish");
        String closed = draft(tenant, "Closed role");
        act(tenant, closed, "publish");
        act(tenant, closed, "close");
        return new String[] {draft, published, closed};
    }

    @Test
    void withNoStatusListsEveryStatusNewestFirst() throws Exception {
        UUID tenant = UUID.randomUUID();
        String[] ids = seed(tenant);

        mvc.perform(get("/api/v1/jobs").header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].id").value(ids[2]))
                .andExpect(jsonPath("$[1].id").value(ids[1]))
                .andExpect(jsonPath("$[2].id").value(ids[0]));
    }

    @Test
    void eachStatusFiltersTheList() throws Exception {
        UUID tenant = UUID.randomUUID();
        String[] ids = seed(tenant);
        String[][] cases = {{"DRAFT", ids[0]}, {"PUBLISHED", ids[1]}, {"CLOSED", ids[2]}};
        for (String[] c : cases) {
            mvc.perform(
                            get("/api/v1/jobs")
                                    .param("status", c[0])
                                    .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].id").value(c[1]))
                    .andExpect(jsonPath("$[0].status").value(c[0]));
        }
        mvc.perform(
                        get("/api/v1/jobs")
                                .param("status", "ARCHIVED")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void anotherTenantSeesNoneOfThem() throws Exception {
        seed(UUID.randomUUID());

        mvc.perform(
                        get("/api/v1/jobs")
                                .header(
                                        TenantIdentityFilter.DEV_TENANT_HEADER,
                                        UUID.randomUUID().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void anUnknownStatusIsA400() throws Exception {
        mvc.perform(
                        get("/api/v1/jobs")
                                .param("status", "OPEN")
                                .header(
                                        TenantIdentityFilter.DEV_TENANT_HEADER,
                                        UUID.randomUUID().toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"));
    }

    @Test
    void theLimitStaysCappedAt100() throws Exception {
        UUID tenant = UUID.randomUUID();
        for (int i = 0; i < 101; i++) {
            draft(tenant, "Role " + i);
        }
        mvc.perform(
                        get("/api/v1/jobs")
                                .param("limit", "500")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(100));
    }
}
