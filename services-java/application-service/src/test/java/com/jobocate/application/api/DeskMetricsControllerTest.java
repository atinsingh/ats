package com.jobocate.application.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobocate.application.IntegrationTestBase;
import com.jobocate.application.api.ApplicationController.CreateApplicationRequest;
import com.jobocate.platform.security.TenantIdentityFilter;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class DeskMetricsControllerTest extends IntegrationTestBase {

    private static final String TENANT = TenantIdentityFilter.DEV_TENANT_HEADER;
    private static final UUID ANA = UUID.fromString("33333333-3333-3333-3333-3333333333a1");
    private static final UUID BEN = UUID.fromString("33333333-3333-3333-3333-3333333333b1");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate sql;

    private UUID apply(UUID tenant, UUID candidate) throws Exception {
        String body =
                mvc.perform(
                                post("/api/v1/applications")
                                        .header(TENANT, tenant.toString())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                json.writeValueAsBytes(
                                                        new CreateApplicationRequest(
                                                                UUID.randomUUID(),
                                                                candidate,
                                                                null,
                                                                null))))
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return UUID.fromString(json.readTree(body).get("id").asText());
    }

    /** A submittal sent today by the given desk. */
    private void submit(UUID tenant, UUID app, UUID client, UUID owner, String state) {
        sql.update(
                """
                INSERT INTO submittals (id, tenant_id, application_id, job_id, candidate_profile_id,
                                        client_id, status, owner_user_id, submitted_at)
                SELECT ?, a.tenant_id, a.id, a.job_id, a.candidate_profile_id, ?, ?, ?, now()
                FROM applications a WHERE a.id = ? AND a.tenant_id = ?
                """,
                UUID.randomUUID(), client, state, owner, app, tenant);
    }

    @Test
    void countsSubmittalsByDeskAndFlagsTwoDesksOnOneCandidate() throws Exception {
        UUID tenant = UUID.randomUUID();
        UUID client = UUID.randomUUID();
        UUID candidate = UUID.randomUUID();
        UUID first = apply(tenant, candidate);
        UUID again = apply(tenant, candidate);
        UUID someoneElse = apply(tenant, UUID.randomUUID());
        submit(tenant, first, client, ANA, "CLIENT_REVIEWING");
        submit(tenant, again, client, BEN, "AWAITING_APPROVAL");
        submit(tenant, someoneElse, client, ANA, "CLIENT_REVIEWING");

        // Another tenant's submittals never count.
        UUID other = UUID.randomUUID();
        submit(other, apply(other, UUID.randomUUID()), client, ANA, "CLIENT_REVIEWING");

        mvc.perform(get("/api/v1/reports/desks").header(TENANT, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days").value(7))
                .andExpect(jsonPath("$.desks.length()").value(2))
                .andExpect(jsonPath("$.desks[?(@.userId == '" + ANA + "')].submittals").value(2))
                .andExpect(jsonPath("$.desks[?(@.userId == '" + BEN + "')].submittals").value(1))
                .andExpect(jsonPath("$.duplicates.length()").value(1))
                .andExpect(jsonPath("$.duplicates[0].candidateProfileId").value(candidate.toString()))
                .andExpect(jsonPath("$.duplicates[0].clientId").value(client.toString()))
                .andExpect(jsonPath("$.duplicates[0].ownerUserIds.length()").value(2));
    }

    @Test
    void aWithdrawnSubmittalIsNotADuplicate() throws Exception {
        UUID tenant = UUID.randomUUID();
        UUID client = UUID.randomUUID();
        UUID candidate = UUID.randomUUID();
        submit(tenant, apply(tenant, candidate), client, ANA, "CLIENT_REVIEWING");
        submit(tenant, apply(tenant, candidate), client, BEN, "WITHDRAWN");

        mvc.perform(get("/api/v1/reports/desks").param("days", "500").header(TENANT, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days").value(90))
                .andExpect(jsonPath("$.duplicates.length()").value(0));
    }

    @Test
    void candidatesCannotReadDeskMetrics() throws Exception {
        mvc.perform(
                        get("/api/v1/reports/desks")
                                .header(TENANT, UUID.randomUUID().toString())
                                .header(TenantIdentityFilter.DEV_ROLES_HEADER, "CANDIDATE"))
                .andExpect(status().isForbidden());
    }
}
