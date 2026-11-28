package com.jobocate.job.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
class ClientControllerTest extends IntegrationTestBase {

    private static final String TENANT = TenantIdentityFilter.DEV_TENANT_HEADER;

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String createClient(UUID tenant, String body) throws Exception {
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

    private String job(UUID tenant, String clientId, boolean publish) throws Exception {
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
        String id = json.readTree(res).get("id").asText();
        if (publish) {
            mvc.perform(post("/api/v1/jobs/{id}/publish", id).header(TENANT, tenant.toString()))
                    .andExpect(status().isOk());
        }
        return id;
    }

    @Test
    void createsAClientWithDefaultsAndReadsItBack() throws Exception {
        UUID tenant = UUID.randomUUID();
        String id = createClient(tenant, "{\"name\":\"Northwind Logistics\"}");

        mvc.perform(get("/api/v1/clients/{id}", id).header(TENANT, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Northwind Logistics"))
                .andExpect(jsonPath("$.status").value("PROSPECT"))
                .andExpect(jsonPath("$.channel").value("Direct"))
                .andExpect(jsonPath("$.openJobs").value(0));
    }

    @Test
    void listsByNameWithCountsOfPublishedJobsOnly() throws Exception {
        UUID tenant = UUID.randomUUID();
        String zeta = createClient(tenant, "{\"name\":\"Zeta Health\",\"status\":\"ACTIVE\"}");
        String acme = createClient(tenant, "{\"name\":\"Acme Foods\",\"status\":\"ACTIVE\"}");
        job(tenant, acme, true);
        job(tenant, acme, true);
        job(tenant, acme, false);
        job(tenant, zeta, true);

        mvc.perform(get("/api/v1/clients").header(TENANT, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(acme))
                .andExpect(jsonPath("$[0].openJobs").value(2))
                .andExpect(jsonPath("$[1].id").value(zeta))
                .andExpect(jsonPath("$[1].openJobs").value(1));
    }

    @Test
    void statusFiltersTheList() throws Exception {
        UUID tenant = UUID.randomUUID();
        createClient(tenant, "{\"name\":\"Active Co\",\"status\":\"ACTIVE\"}");
        String dormant = createClient(tenant, "{\"name\":\"Dormant Co\",\"status\":\"DORMANT\"}");

        mvc.perform(get("/api/v1/clients?status=DORMANT").header(TENANT, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(dormant));

        mvc.perform(get("/api/v1/clients?status=NOPE").header(TENANT, tenant.toString()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void patchChangesOnlyTheGivenFields() throws Exception {
        UUID tenant = UUID.randomUUID();
        String id = createClient(tenant, "{\"name\":\"Patch Co\",\"channel\":\"Referral\"}");

        mvc.perform(
                        patch("/api/v1/clients/{id}", id)
                                .header(TENANT, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"status\":\"ACTIVE\",\"msaEndsOn\":\"2027-03-31\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Patch Co"))
                .andExpect(jsonPath("$.channel").value("Referral"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.msaEndsOn").value("2027-03-31"));
    }

    @Test
    void duplicateNameIsAConflictIgnoringCase() throws Exception {
        UUID tenant = UUID.randomUUID();
        createClient(tenant, "{\"name\":\"Globex\"}");
        String other = createClient(tenant, "{\"name\":\"Initech\"}");

        mvc.perform(
                        post("/api/v1/clients")
                                .header(TENANT, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"GLOBEX\"}"))
                .andExpect(status().isConflict());

        mvc.perform(
                        patch("/api/v1/clients/{id}", other)
                                .header(TENANT, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"globex\"}"))
                .andExpect(status().isConflict());

        // Another tenant may use the same name.
        createClient(UUID.randomUUID(), "{\"name\":\"Globex\"}");
    }

    @Test
    void blankNameIsRejected() throws Exception {
        mvc.perform(
                        post("/api/v1/clients")
                                .header(TENANT, UUID.randomUUID().toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"  \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anotherTenantCannotSeeTheClient() throws Exception {
        UUID tenant = UUID.randomUUID();
        String id = createClient(tenant, "{\"name\":\"Private Co\"}");
        UUID other = UUID.randomUUID();

        mvc.perform(get("/api/v1/clients/{id}", id).header(TENANT, other.toString()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/clients").header(TENANT, other.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void candidatesCannotReadClients() throws Exception {
        mvc.perform(
                        get("/api/v1/clients")
                                .header(TENANT, UUID.randomUUID().toString())
                                .header(TenantIdentityFilter.DEV_ROLES_HEADER, "CANDIDATE"))
                .andExpect(status().isForbidden());
    }
}
