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
class DeskCountsControllerTest extends IntegrationTestBase {

    private static final String TENANT = TenantIdentityFilter.DEV_TENANT_HEADER;
    private static final String ROLES = TenantIdentityFilter.DEV_ROLES_HEADER;

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String client(UUID tenant, String name, UUID owner) throws Exception {
        String body = "{\"name\":\"" + name + "\",\"ownerUserId\":\"" + owner + "\"}";
        String res =
                mvc.perform(
                                post("/api/v1/clients")
                                        .header(TENANT, tenant.toString())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(body))
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return json.readTree(res).get("id").asText();
    }

    private void job(UUID tenant, String clientId, boolean publish) throws Exception {
        CreateJobRequest req =
                new CreateJobRequest(
                        "Role", null, "A description", null, null, "FULL_TIME", null, null, null,
                        null, null, null, null, null, null, null, UUID.fromString(clientId), null,
                        List.of());
        String res =
                mvc.perform(
                                post("/api/v1/jobs")
                                        .header(TENANT, tenant.toString())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(json.writeValueAsBytes(req)))
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        if (publish) {
            String id = json.readTree(res).get("id").asText();
            mvc.perform(post("/api/v1/jobs/{id}/publish", id).header(TENANT, tenant.toString()))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void countsPublishedRolesAndNewClientsByClientOwner() throws Exception {
        UUID tenant = UUID.randomUUID();
        UUID ana = UUID.randomUUID();
        UUID ben = UUID.randomUUID();
        String northwind = client(tenant, "Northwind", ana);
        client(tenant, "Contoso", ben);
        job(tenant, northwind, true);
        job(tenant, northwind, true);
        job(tenant, northwind, false); // a draft is not an open role

        // Another tenant's work never shows.
        UUID other = UUID.randomUUID();
        job(other, client(other, "Elsewhere", ana), true);

        mvc.perform(get("/api/v1/reports/desk-roles?days=7").header(TENANT, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days").value(7))
                .andExpect(jsonPath("$.desks.length()").value(2))
                .andExpect(jsonPath("$.desks[0].userId").value(ana.toString()))
                .andExpect(jsonPath("$.desks[0].roles").value(2))
                .andExpect(jsonPath("$.desks[0].newClients").value(1))
                .andExpect(jsonPath("$.desks[1].userId").value(ben.toString()))
                .andExpect(jsonPath("$.desks[1].roles").value(0))
                .andExpect(jsonPath("$.desks[1].newClients").value(1));
    }

    @Test
    void candidatesCannotReadDeskCounts() throws Exception {
        mvc.perform(
                        get("/api/v1/reports/desk-roles")
                                .header(TENANT, UUID.randomUUID().toString())
                                .header(ROLES, "CANDIDATE"))
                .andExpect(status().isForbidden());
    }
}
