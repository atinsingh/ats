package com.jobocate.auth.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jobocate.auth.IntegrationTestBase;
import com.jobocate.platform.security.TenantIdentityFilter;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class ColleagueControllerTest extends IntegrationTestBase {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    private UUID user(String name, String email) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)", id, email, name);
        return id;
    }

    private void grant(UUID user, UUID tenant, String role, boolean revoked) {
        jdbc.update(
                "INSERT INTO user_roles (id, user_id, tenant_id, role, revoked_at) VALUES (?, ?, ?, ?, "
                        + (revoked ? "now()" : "NULL")
                        + ")",
                UUID.randomUUID(),
                user,
                tenant,
                role);
    }

    @Test
    void listsTheTenantsStaffOnly() throws Exception {
        UUID tenant = UUID.randomUUID();
        UUID priya = user("Sample Recruiter", UUID.randomUUID() + "@example.test");
        grant(priya, tenant, "RECRUITER", false);
        grant(priya, tenant, "TENANT_ADMIN", false);
        UUID gone = user("Revoked Person", UUID.randomUUID() + "@example.test");
        grant(gone, tenant, "RECRUITER", true);
        UUID candidate = user("A Candidate", UUID.randomUUID() + "@example.test");
        grant(candidate, tenant, "CANDIDATE", false);
        UUID elsewhere = user("Other Tenant Recruiter", UUID.randomUUID() + "@example.test");
        grant(elsewhere, UUID.randomUUID(), "RECRUITER", false);

        mvc.perform(
                        get("/api/v1/colleagues")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, tenant.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(priya.toString()))
                .andExpect(jsonPath("$[0].displayName").value("Sample Recruiter"))
                .andExpect(jsonPath("$[0].roles[0]").value("RECRUITER"))
                .andExpect(jsonPath("$[0].roles[1]").value("TENANT_ADMIN"))
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
    }

    @Test
    void candidatesCannotListColleagues() throws Exception {
        mvc.perform(
                        get("/api/v1/colleagues")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, UUID.randomUUID().toString())
                                .header(TenantIdentityFilter.DEV_ROLES_HEADER, "CANDIDATE"))
                .andExpect(status().isForbidden());
    }

    @Test
    void otherPathsStayClosed() throws Exception {
        mvc.perform(
                        get("/api/v1/users")
                                .header(TenantIdentityFilter.DEV_TENANT_HEADER, UUID.randomUUID().toString()))
                .andExpect(status().isForbidden());
    }

    @Test
    void theDemoTokenEndpointStaysPublic() throws Exception {
        mvc.perform(
                        post("/api/auth/demo-token")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"tenantId\":\"" + UUID.randomUUID()
                                                + "\",\"subject\":\"sample\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token_type").value("Bearer"));
    }
}
