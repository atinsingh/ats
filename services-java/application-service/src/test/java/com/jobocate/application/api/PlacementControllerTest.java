package com.jobocate.application.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
class PlacementControllerTest extends IntegrationTestBase {

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
    void recordsAPlacementForAHiredApplication() throws Exception {
        UUID tenant = UUID.randomUUID();
        String app = hired(tenant);
        place(tenant, app, "2026-12-01", "2027-05-31", "")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.applicationId").value(app))
                .andExpect(jsonPath("$.startDate").value("2026-12-01"))
                .andExpect(jsonPath("$.endDate").value("2027-05-31"))
                .andExpect(jsonPath("$.billRate").value(95))
                .andExpect(jsonPath("$.payRate").value(72.5))
                .andExpect(jsonPath("$.extension").value("NONE"))
                .andExpect(jsonPath("$.ownerUserId").value(USER));

        // The application stays where the person put it.
        mvc.perform(get("/api/v1/applications/{id}", app).header(TENANT, tenant.toString()))
                .andExpect(jsonPath("$.status").value("HIRED"));
    }

    @Test
    void onlyAHiredApplicationCanBePlacedAndOnlyOnce() throws Exception {
        UUID tenant = UUID.randomUUID();
        String notHired = apply(tenant);
        place(tenant, notHired, "2026-12-01", "2027-05-31", "")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("PLACEMENT_NOT_HIRED"));

        String app = hired(tenant);
        placed(tenant, app, "2026-12-01");
        place(tenant, app, "2026-12-01", "2027-05-31", "")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("PLACEMENT_DUPLICATE"));
    }

    @Test
    void rejectsBadDatesAndRates() throws Exception {
        UUID tenant = UUID.randomUUID();
        String app = hired(tenant);
        place(tenant, app, "2027-01-01", "2026-12-01", "").andExpect(status().isBadRequest());
        mvc.perform(
                        post("/api/v1/placements")
                                .header(TENANT, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"applicationId\":\"" + app
                                                + "\",\"startDate\":\"2026-12-01\",\"endDate\":\"2027-01-01\","
                                                + "\"billRate\":-1,\"payRate\":50}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void theClientDefaultsToTheLatestSubmittal() throws Exception {
        UUID tenant = UUID.randomUUID();
        UUID client = UUID.randomUUID();
        String app = apply(tenant);
        mvc.perform(
                        post("/api/v1/submittals")
                                .header(TENANT, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"applicationId\":\"" + app + "\",\"clientId\":\"" + client
                                                + "\"}"))
                .andExpect(status().isCreated());
        move(tenant, app, ApplicationStatus.SHORTLISTED);
        move(tenant, app, ApplicationStatus.OFFERED);
        move(tenant, app, ApplicationStatus.HIRED);

        place(tenant, app, "2026-12-01", "2027-05-31", "")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.clientId").value(client.toString()));
    }

    @Test
    void patchChangesEndDateAndExtension() throws Exception {
        UUID tenant = UUID.randomUUID();
        String id = placed(tenant, hired(tenant), "2026-12-01");

        mvc.perform(
                        patch("/api/v1/placements/{id}", id)
                                .header(TENANT, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"endDate\":\"2027-12-31\",\"extension\":\"AGREED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.endDate").value("2027-12-31"))
                .andExpect(jsonPath("$.extension").value("AGREED"))
                .andExpect(jsonPath("$.billRate").value(95));

        mvc.perform(
                        patch("/api/v1/placements/{id}", id)
                                .header(TENANT, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"endDate\":\"2026-11-01\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listsNewestStartFirst() throws Exception {
        UUID tenant = UUID.randomUUID();
        String earlier = placed(tenant, hired(tenant), "2026-10-01");
        String later = placed(tenant, hired(tenant), "2027-01-15");

        mvc.perform(get("/api/v1/placements").header(TENANT, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(later))
                .andExpect(jsonPath("$[1].id").value(earlier));
    }

    @Test
    void anotherTenantCannotSeeIt() throws Exception {
        UUID tenant = UUID.randomUUID();
        String id = placed(tenant, hired(tenant), "2026-12-01");
        UUID other = UUID.randomUUID();
        mvc.perform(get("/api/v1/placements/{id}", id).header(TENANT, other.toString()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/placements").header(TENANT, other.toString()))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void candidatesCannotReadPlacements() throws Exception {
        mvc.perform(
                        get("/api/v1/placements")
                                .header(TENANT, UUID.randomUUID().toString())
                                .header(TenantIdentityFilter.DEV_ROLES_HEADER, "CANDIDATE"))
                .andExpect(status().isForbidden());
    }
}
