package com.jobocate.candidate.api;

import com.jobocate.candidate.infrastructure.persistence.CandidateJpaRepository;
import com.jobocate.candidate.infrastructure.persistence.CandidateProfileEntity;
import com.jobocate.platform.tenant.TenantContext;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

    /** Recruiter-side detail. Another tenant's or a deleted candidate is a 404. */
    @GetMapping("/{id}")
    public CandidateDetailResponse get(@PathVariable("id") UUID id) {
        UUID tenant = TenantContext.requireTenant();
        return candidates
                .findByTenantIdAndIdAndDeletedAtIsNull(tenant, id)
                .map(CandidateDetailResponse::from)
                .orElseThrow(() -> new CandidateNotFoundException(id));
    }

    public record CandidateDetailResponse(
            String id,
            String email,
            String fullName,
            String headline,
            String summary,
            String locationCity,
            String locationRegion,
            String locationCountry,
            String availability,
            String visibility,
            boolean consentSearchable) {
        static CandidateDetailResponse from(CandidateProfileEntity c) {
            return new CandidateDetailResponse(
                    c.getId().toString(),
                    c.getEmail(),
                    c.getFullName(),
                    c.getHeadline(),
                    c.getSummary(),
                    c.getLocationCity(),
                    c.getLocationRegion(),
                    c.getLocationCountry(),
                    c.getAvailability() == null ? null : c.getAvailability().name(),
                    c.getProfileVisibility() == null ? null : c.getProfileVisibility().name(),
                    c.isConsentSearchable());
        }
    }

    public record CandidateResponse(String id, String email, String fullName, String headline) {
        static CandidateResponse from(CandidateProfileEntity c) {
            return new CandidateResponse(
                    c.getId().toString(), c.getEmail(), c.getFullName(), c.getHeadline());
        }
    }
}
