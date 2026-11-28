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
import org.springframework.test.web.servlet.ResultActions;

@AutoConfigureMockMvc
class ActivityControllerTest extends IntegrationTestBase {

    private static final String TENANT = TenantIdentityFilter.DEV_TENANT_HEADER;
    private static final String USER = "33333333-3333-3333-3333-333333333301";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String apply(UUID tenant) throws Exception {
        String body =
                mvc.perform(
                                post("/api/v1/applications")
                                        .header(TENANT, tenant.toString())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                json.writeValueAsBytes(
                                                        new CreateApplicationRequest(
                                                                UUID.randomUUID(),
                                                                UUID.randomUUID(),
                                                                null,
                                                                null))))
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    private void move(UUID tenant, String app, ApplicationStatus to) throws Exception {
        mvc.perform(
                        post("/api/v1/applications/{id}/status", app)
                                .header(TENANT, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsBytes(new ChangeStatusRequest(to, null))))
                .andExpect(status().isOk());
    }

    /** An application a person has moved all the way to HIRED. */
    private String hired(UUID tenant) throws Exception {
        String app = apply(tenant);
        move(tenant, app, ApplicationStatus.SHORTLISTED);
        move(tenant, app, ApplicationStatus.OFFERED);
        move(tenant, app, ApplicationStatus.HIRED);
        return app;
    }

    private ResultActions place(UUID tenant, String app, String start, String end, String extra)
            throws Exception {
        return mvc.perform(
                post("/api/v1/placements")
                        .header(TENANT, tenant.toString())
                        .header("X-Jobocate-User-Id", USER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                "{\"applicationId\":\"" + app + "\",\"startDate\":\"" + start
                                        + "\",\"endDate\":\"" + end
                                        + "\",\"billRate\":95,\"payRate\":72.5" + extra + "}"));
    }

    private String placed(UUID tenant, String app, String start) throws Exception {
        String body =
                place(tenant, app, start, "2027-06-30", "")
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    @Test
    void listsPeoplesMovesNewestFirstForTheTenantOnly() throws Exception {
        UUID tenant = UUID.randomUUID();
        String app = apply(tenant);
        mvc.perform(
                        post("/api/v1/applications/{id}/status", app)
                                .header(TENANT, tenant.toString())
                                .header("X-Jobocate-User-Id", USER)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsBytes(
                                                new ChangeStatusRequest(
                                                        ApplicationStatus.SHORTLISTED, null))))
                .andExpect(status().isOk());
        // Another tenant's moves never show up.
        hired(UUID.randomUUID());

        mvc.perform(get("/api/v1/activity").header(TENANT, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("STATUS_CHANGE"))
                .andExpect(jsonPath("$[0].toValue").value("SHORTLISTED"))
                .andExpect(jsonPath("$[0].actorKind").value("PERSON"))
                .andExpect(jsonPath("$[0].actorUserId").value(USER))
                .andExpect(jsonPath("$[0].applicationId").value(app))
                .andExpect(jsonPath("$[0].candidateProfileId").isNotEmpty())
                .andExpect(jsonPath("$[?(@.toValue == 'HIRED')]").isEmpty());
    }

    @Test
    void capsTheLimit() throws Exception {
        UUID tenant = UUID.randomUUID();
        apply(tenant);
        apply(tenant);
        mvc.perform(get("/api/v1/activity").param("limit", "1").header(TENANT, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void candidatesCannotReadTheActivityLog() throws Exception {
        mvc.perform(
                        get("/api/v1/activity")
                                .header(TENANT, UUID.randomUUID().toString())
                                .header(TenantIdentityFilter.DEV_ROLES_HEADER, "CANDIDATE"))
                .andExpect(status().isForbidden());
    }
}
