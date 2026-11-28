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
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@AutoConfigureMockMvc
class InterviewControllerTest extends IntegrationTestBase {

    private static final String USER = "33333333-3333-3333-3333-333333333301";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String apply(UUID tenant, UUID job) throws Exception {
        String body =
                mvc.perform(
                                post("/api/v1/applications")
                                        .header(
                                                TenantIdentityFilter.DEV_TENANT_HEADER,
                                                tenant.toString())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                json.writeValueAsBytes(
                                                        new CreateApplicationRequest(
                                                                job, UUID.randomUUID(), null,
                                                                null))))
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    private ResultActions schedule(UUID tenant, String applicationId, Instant start, Instant end)
            throws Exception {
        Map<String, Object> req = new LinkedHashMap<>();
        req.put("applicationId", applicationId);
        req.put("type", "VIDEO");
        req.put("scheduledStart", start.toString());
        req.put("scheduledEnd", end.toString());
        req.put("meetingUrl", "https://meet.example.test/abc");
        return mvc.perform(
                post("/api/v1/interviews")
                        .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString())
                        .header("X-Jobocate-User-Id", USER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(req)));
    }

    private String scheduled(UUID tenant, String applicationId, Instant start) throws Exception {
        String body =
                schedule(tenant, applicationId, start, start.plus(45, ChronoUnit.MINUTES))
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    private static Instant inHours(long h) {
        return Instant.now().plus(h, ChronoUnit.HOURS).truncatedTo(ChronoUnit.SECONDS);
    }

    @Test
    void schedulesAndListsUpcomingSoonestFirst() throws Exception {
        UUID tenant = UUID.randomUUID();
        UUID job = UUID.randomUUID();
        String app = apply(tenant, job);
        String later = scheduled(tenant, app, inHours(48));
        String sooner = scheduled(tenant, app, inHours(3));
        scheduled(tenant, app, inHours(24 * 10)); // outside the default 7-day window

        mvc.perform(
                        get("/api/v1/interviews")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(sooner))
                .andExpect(jsonPath("$[1].id").value(later))
                .andExpect(jsonPath("$[0].jobId").value(job.toString()))
                .andExpect(jsonPath("$[0].status").value("SCHEDULED"))
                .andExpect(jsonPath("$[0].type").value("VIDEO"));

        mvc.perform(
                        get("/api/v1/interviews")
                                .param("applicationId", app)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));

        // Scheduling does not move the application's stage.
        mvc.perform(
                        get("/api/v1/applications/{id}", app)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPLIED"));
    }

    @Test
    void rejectsBadTimesAndTerminalApplications() throws Exception {
        UUID tenant = UUID.randomUUID();
        String app = apply(tenant, UUID.randomUUID());
        Instant start = inHours(5);

        schedule(tenant, app, start, start)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"));
        schedule(tenant, app, start, start.plus(9, ChronoUnit.HOURS))
                .andExpect(status().isBadRequest());

        mvc.perform(
                        post("/api/v1/applications/{id}/status", app)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsBytes(
                                                new ChangeStatusRequest(
                                                        ApplicationStatus.REJECTED,
                                                        "Not a fit"))))
                .andExpect(status().isOk());
        schedule(tenant, app, start, start.plus(1, ChronoUnit.HOURS))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("INTERVIEW_INVALID_STATE"));
    }

    @Test
    void cancellingNeedsAReasonAndRemovesItFromTheAgenda() throws Exception {
        UUID tenant = UUID.randomUUID();
        String id = scheduled(tenant, apply(tenant, UUID.randomUUID()), inHours(4));

        mvc.perform(
                        post("/api/v1/interviews/{id}/cancel", id)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"reason\":\" \"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        post("/api/v1/interviews/{id}/cancel", id)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"reason\":\"Candidate accepted another offer\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancellationReason").value("Candidate accepted another offer"));
        mvc.perform(
                        post("/api/v1/interviews/{id}/cancel", id)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"reason\":\"again\"}"))
                .andExpect(status().isConflict());

        mvc.perform(
                        get("/api/v1/interviews")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void storesAndListsScorecards() throws Exception {
        UUID tenant = UUID.randomUUID();
        String id = scheduled(tenant, apply(tenant, UUID.randomUUID()), inHours(2));
        Map<String, Object> card =
                Map.of(
                        "overallScore", 4,
                        "recommendation", "HIRE",
                        "scores",
                                List.of(
                                        Map.of("area", "Java", "score", 5, "note", "Strong"),
                                        Map.of("area", "Communication", "score", 2)),
                        "summary", "Good depth, needs to explain trade-offs more clearly.");

        mvc.perform(
                        post("/api/v1/interviews/{id}/feedback", id)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsBytes(card)))
                .andExpect(status().isBadRequest()); // no interviewer id

        mvc.perform(
                        post("/api/v1/interviews/{id}/feedback", id)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString())
                                .header("X-Jobocate-User-Id", USER)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsBytes(Map.of("overallScore", 6))))
                .andExpect(status().isBadRequest());

        mvc.perform(
                        post("/api/v1/interviews/{id}/feedback", id)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString())
                                .header("X-Jobocate-User-Id", USER)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsBytes(card)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.interviewerUserId").value(USER));

        mvc.perform(
                        get("/api/v1/interviews/{id}/feedback", id)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].overallScore").value(4))
                .andExpect(jsonPath("$[0].recommendation").value("HIRE"))
                .andExpect(jsonPath("$[0].scores[1].area").value("Communication"))
                .andExpect(jsonPath("$[0].scores[1].score").value(2));
    }

    @Test
    void anotherTenantCannotSeeOrTouchIt() throws Exception {
        UUID tenant = UUID.randomUUID();
        String app = apply(tenant, UUID.randomUUID());
        String id = scheduled(tenant, app, inHours(3));
        UUID other = UUID.randomUUID();

        mvc.perform(
                        get("/api/v1/interviews")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, other.toString()))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(
                        get("/api/v1/interviews/{id}/feedback", id)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, other.toString()))
                .andExpect(status().isNotFound());
        mvc.perform(
                        post("/api/v1/interviews/{id}/cancel", id)
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, other.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"reason\":\"not mine\"}"))
                .andExpect(status().isNotFound());
        schedule(other, app, inHours(5), inHours(6)).andExpect(status().isNotFound());
    }

    @Test
    void aCandidateCannotUseTheInterviewsApi() throws Exception {
        mvc.perform(
                        get("/api/v1/interviews")
                                .header(
                                        TenantIdentityFilter.DEV_TENANT_HEADER,
                                        UUID.randomUUID().toString())
                                .header(TenantIdentityFilter.DEV_ROLES_HEADER, "CANDIDATE"))
                .andExpect(status().isForbidden());
    }
}
