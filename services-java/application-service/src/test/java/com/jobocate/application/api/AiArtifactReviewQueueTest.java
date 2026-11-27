package com.jobocate.application.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobocate.application.IntegrationTestBase;
import com.jobocate.application.api.AiArtifactController.RequestArtifactRequest;
import com.jobocate.application.application.AiArtifactService;
import com.jobocate.application.application.AiArtifactService.RecordResultCommand;
import com.jobocate.application.infrastructure.persistence.AiArtifactKind;
import com.jobocate.application.infrastructure.persistence.AiArtifactSubjectType;
import com.jobocate.platform.security.TenantIdentityFilter;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class AiArtifactReviewQueueTest extends IntegrationTestBase {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AiArtifactService service;

    private String requestDraft(UUID tenant) throws Exception {
        RequestArtifactRequest req =
                new RequestArtifactRequest(
                        AiArtifactKind.COVER_LETTER,
                        AiArtifactSubjectType.CANDIDATE_PROFILE,
                        UUID.randomUUID(),
                        null,
                        null,
                        null,
                        "v1",
                        "pending",
                        Map.of(),
                        null);
        String body =
                mvc.perform(
                                post("/api/v1/ai-artifacts")
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

    private String readyDraft(UUID tenant) throws Exception {
        String id = requestDraft(tenant);
        service.recordSuccess(
                tenant,
                UUID.fromString(id),
                new RecordResultCommand("Dear hiring team", null, "model-x", "v1", null, null));
        return id;
    }

    @Test
    void listsOnlyDraftsWaitingForReviewOldestFirst() throws Exception {
        UUID tenant = UUID.randomUUID();
        String older = readyDraft(tenant);
        String newer = readyDraft(tenant);
        requestDraft(tenant); // still generating, not ready
        String approved = readyDraft(tenant);
        mvc.perform(
                        post("/api/v1/ai-artifacts/{id}/approve", approved)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk());

        mvc.perform(
                        get("/api/v1/ai-artifacts/review-queue")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(older))
                .andExpect(jsonPath("$[1].id").value(newer))
                .andExpect(jsonPath("$[0].status").value("READY_FOR_REVIEW"))
                .andExpect(jsonPath("$[0].outputText").value("Dear hiring team"));
    }

    @Test
    void anotherTenantSeesNothing() throws Exception {
        readyDraft(UUID.randomUUID());

        mvc.perform(
                        get("/api/v1/ai-artifacts/review-queue")
                                .header(
                                        TenantIdentityFilter.DEV_TENANT_HEADER,
                                        UUID.randomUUID().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void theLimitIsRespected() throws Exception {
        UUID tenant = UUID.randomUUID();
        readyDraft(tenant);
        readyDraft(tenant);

        mvc.perform(
                        get("/api/v1/ai-artifacts/review-queue")
                                .param("limit", "1")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void aCandidateCannotSeeTheReviewQueue() throws Exception {
        mvc.perform(
                        get("/api/v1/ai-artifacts/review-queue")
                                .header(
                                        TenantIdentityFilter.DEV_TENANT_HEADER,
                                        UUID.randomUUID().toString())
                                .header(TenantIdentityFilter.DEV_ROLES_HEADER, "CANDIDATE"))
                .andExpect(status().isForbidden());
    }
}
