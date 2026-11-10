package com.jobocate.application.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobocate.application.IntegrationTestBase;
import com.jobocate.application.api.ApplicationController.CreateApplicationRequest;
import com.jobocate.platform.security.TenantIdentityFilter;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class ApplicationControllerTest extends IntegrationTestBase {

    private static final UUID TENANT = UUID.fromString("00000000-0000-0000-0000-00000000aaaa");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void postCreatesApplicationAndReturns201() throws Exception {
        UUID job = UUID.randomUUID();
        UUID candidate = UUID.randomUUID();
        CreateApplicationRequest req = new CreateApplicationRequest(job, candidate, null, null);

        mvc.perform(
                        post("/api/v1/applications")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, TENANT.toString())
                                .header("Idempotency-Key", "ctl-1")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsBytes(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("APPLIED"))
                .andExpect(jsonPath("$.tenantId").value(TENANT.toString()));
    }

    @Test
    void duplicatePostReturns409WithErrorEnvelope() throws Exception {
        UUID job = UUID.randomUUID();
        UUID candidate = UUID.randomUUID();
        CreateApplicationRequest req = new CreateApplicationRequest(job, candidate, null, null);

        mvc.perform(
                        post("/api/v1/applications")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, TENANT.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsBytes(req)))
                .andExpect(status().isCreated());

        mvc.perform(
                        post("/api/v1/applications")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, TENANT.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsBytes(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("APPLICATION_DUPLICATE"))
                .andExpect(header().exists("Content-Type"));
    }

    @Test
    void missingTenantReturns401() throws Exception {
        UUID job = UUID.randomUUID();
        UUID candidate = UUID.randomUUID();
        CreateApplicationRequest req = new CreateApplicationRequest(job, candidate, null, null);
        mvc.perform(
                        post("/api/v1/applications")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsBytes(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getReturns404ForOtherTenant() throws Exception {
        // Submit under tenant A.
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        UUID job = UUID.randomUUID();
        UUID candidate = UUID.randomUUID();
        CreateApplicationRequest req = new CreateApplicationRequest(job, candidate, null, null);
        var result =
                mvc.perform(
                                post("/api/v1/applications")
                                        .header(
                                                TenantIdentityFilter.DEV_TENANT_HEADER,
                                                tenantA.toString())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(json.writeValueAsBytes(req)))
                        .andExpect(status().isCreated())
                        .andReturn();
        String body = result.getResponse().getContentAsString();
        String id = json.readTree(body).get("id").asText();

        mvc.perform(
                        get("/api/v1/applications/{id}", id)
                                .header(
                                        TenantIdentityFilter.DEV_TENANT_HEADER,
                                        tenantB.toString()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("APPLICATION_NOT_FOUND"));
    }
}
