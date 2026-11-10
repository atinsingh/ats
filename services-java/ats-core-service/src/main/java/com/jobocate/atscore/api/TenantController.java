package com.jobocate.atscore.api;

import com.jobocate.atscore.application.TenantQueryService;
import com.jobocate.atscore.infrastructure.persistence.TenantEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/tenants")
public class TenantController {

    private final TenantQueryService tenants;

    public TenantController(TenantQueryService tenants) {
        this.tenants = tenants;
    }

    @GetMapping("/me")
    public TenantResponse me() {
        return tenants.current()
                .map(TenantResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/{slug}")
    public TenantResponse bySlug(@PathVariable("slug") String slug) {
        return tenants.bySlug(slug)
                .map(TenantResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    public record TenantResponse(String id, String slug, String displayName, String status) {
        static TenantResponse from(TenantEntity t) {
            return new TenantResponse(
                    t.getId().toString(), t.getSlug(), t.getDisplayName(), t.getStatus());
        }
    }
}
