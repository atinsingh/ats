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
class SubmittalControllerTest extends IntegrationTestBase {

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

    private ResultActions submit(UUID tenant, String applicationId) throws Exception {
        return mvc.perform(
                post("/api/v1/submittals")
                        .header(TENANT, tenant.toString())
                        .header("X-Jobocate-User-Id", USER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                "{\"applicationId\":\""
                                        + applicationId
                                        + "\",\"channel\":\"Beeline\",\"billRate\":92.50}"));
    }

    private String created(UUID tenant, String applicationId) throws Exception {
        String body =
                submit(tenant, applicationId)
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    private ResultActions approve(UUID tenant, String id, boolean asPerson) throws Exception {
        var req = post("/api/v1/submittals/{id}/approve", id).header(TENANT, tenant.toString());
        if (asPerson) req = req.header("X-Jobocate-User-Id", USER);
        return mvc.perform(req);
    }

    private ResultActions clientUpdate(UUID tenant, String id, String body) throws Exception {
        return mvc.perform(
                post("/api/v1/submittals/{id}/client-update", id)
                        .header(TENANT, tenant.toString())
                        .header("X-Jobocate-User-Id", USER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body));
    }

    @Test
    void createsWaitingForApprovalWithTheApplicationsJobAndCandidate() throws Exception {
        UUID tenant = UUID.randomUUID();
        String app = apply(tenant);
        submit(tenant, app)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("AWAITING_APPROVAL"))
                .andExpect(jsonPath("$.applicationId").value(app))
                .andExpect(jsonPath("$.jobId").isNotEmpty())
                .andExpect(jsonPath("$.candidateProfileId").isNotEmpty())
                .andExpect(jsonPath("$.channel").value("Beeline"))
                .andExpect(jsonPath("$.billRate").value(92.5))
                .andExpect(jsonPath("$.ownerUserId").value(USER))
                .andExpect(jsonPath("$.submittedAt").doesNotExist());

        // Submitting never moves the application.
        mvc.perform(get("/api/v1/applications/{id}", app).header(TENANT, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPLIED"));
    }

    @Test
    void approvalNeedsAPersonAndHappensOnce() throws Exception {
        UUID tenant = UUID.randomUUID();
        String id = created(tenant, apply(tenant));

        approve(tenant, id, false).andExpect(status().isBadRequest());
        approve(tenant, id, true)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLIENT_REVIEWING"))
                .andExpect(jsonPath("$.approvedByUserId").value(USER))
                .andExpect(jsonPath("$.submittedAt").isNotEmpty());
        approve(tenant, id, true)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SUBMITTAL_INVALID_STATE"));
    }

    @Test
    void oneOpenSubmittalPerApplication() throws Exception {
        UUID tenant = UUID.randomUUID();
        String app = apply(tenant);
        String first = created(tenant, app);
        submit(tenant, app)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SUBMITTAL_DUPLICATE"));

        mvc.perform(
                        post("/api/v1/submittals/{id}/withdraw", first)
                                .header(TENANT, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"reason\":\"Candidate took another role\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WITHDRAWN"))
                .andExpect(jsonPath("$.latestNote").value("Candidate took another role"));
        // Once withdrawn, the application can be put forward again.
        submit(tenant, app).andExpect(status().isCreated());
    }

    @Test
    void aClosedApplicationCannotBeSubmitted() throws Exception {
        UUID tenant = UUID.randomUUID();
        String app = apply(tenant);
        mvc.perform(
                        post("/api/v1/applications/{id}/status", app)
                                .header(TENANT, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsBytes(
                                                new ChangeStatusRequest(
                                                        ApplicationStatus.REJECTED, "Not a fit"))))
                .andExpect(status().isOk());
        submit(tenant, app)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SUBMITTAL_INVALID_STATE"));
    }

    @Test
    void clientUpdatesApplyOnlyOnceItIsWithTheClient() throws Exception {
        UUID tenant = UUID.randomUUID();
        String id = created(tenant, apply(tenant));

        clientUpdate(tenant, id, "{\"status\":\"INTERVIEW\"}").andExpect(status().isConflict());

        approve(tenant, id, true).andExpect(status().isOk());
        clientUpdate(tenant, id, "{\"status\":\"INTERVIEW\",\"note\":\"Interview Dec 3\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INTERVIEW"))
                .andExpect(jsonPath("$.latestNote").value("Interview Dec 3"))
                .andExpect(jsonPath("$.lastClientActivityAt").isNotEmpty());

        clientUpdate(tenant, id, "{\"status\":\"AWAITING_APPROVAL\"}")
                .andExpect(status().isBadRequest());
        clientUpdate(tenant, id, "{}").andExpect(status().isBadRequest());
    }

    @Test
    void listsNewestFirstAndFiltersByStatus() throws Exception {
        UUID tenant = UUID.randomUUID();
        String older = created(tenant, apply(tenant));
        String newer = created(tenant, apply(tenant));
        approve(tenant, older, true).andExpect(status().isOk());

        mvc.perform(get("/api/v1/submittals").header(TENANT, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(newer))
                .andExpect(jsonPath("$[1].id").value(older));

        mvc.perform(
                        get("/api/v1/submittals")
                                .param("status", "CLIENT_REVIEWING")
                                .header(TENANT, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(older));
    }

    @Test
    void anotherTenantCannotSeeOrApprove() throws Exception {
        UUID tenant = UUID.randomUUID();
        String id = created(tenant, apply(tenant));
        UUID other = UUID.randomUUID();

        mvc.perform(get("/api/v1/submittals/{id}", id).header(TENANT, other.toString()))
                .andExpect(status().isNotFound());
        approve(other, id, true).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/submittals").header(TENANT, other.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        // Another tenant cannot submit this tenant's application either.
        submit(other, json.readTree(
                        mvc.perform(get("/api/v1/submittals/{id}", id).header(TENANT, tenant.toString()))
                                .andReturn()
                                .getResponse()
                                .getContentAsString())
                        .get("applicationId")
                        .asText())
                .andExpect(status().isNotFound());
    }

    @Test
    void candidatesCannotReadSubmittals() throws Exception {
        mvc.perform(
                        get("/api/v1/submittals")
                                .header(TENANT, UUID.randomUUID().toString())
                                .header(TenantIdentityFilter.DEV_ROLES_HEADER, "CANDIDATE"))
                .andExpect(status().isForbidden());
    }
}
