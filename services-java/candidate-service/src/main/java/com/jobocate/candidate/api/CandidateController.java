package com.jobocate.candidate.api;

import com.jobocate.candidate.infrastructure.persistence.CandidateJpaRepository;
import com.jobocate.candidate.infrastructure.persistence.CandidateProfileEntity;
import com.jobocate.platform.tenant.TenantContext;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/candidates")
public class CandidateController {

    private final CandidateJpaRepository candidates;

    public CandidateController(CandidateJpaRepository candidates) {
        this.candidates = candidates;
    }

    @GetMapping
    public List<CandidateResponse> list() {
        UUID tenant = TenantContext.requireTenant();
        return candidates.findByTenantIdOrderByCreatedAtDesc(tenant).stream()
                .map(CandidateResponse::from)
                .toList();
    }

    public record CandidateResponse(String id, String email, String fullName, String headline) {
        static CandidateResponse from(CandidateProfileEntity c) {
            return new CandidateResponse(
                    c.getId().toString(), c.getEmail(), c.getFullName(), c.getHeadline());
        }
    }
}
