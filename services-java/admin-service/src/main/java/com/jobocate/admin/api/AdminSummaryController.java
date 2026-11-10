package com.jobocate.admin.api;

import com.jobocate.platform.tenant.TenantContext;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminSummaryController {

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        UUID tenant = TenantContext.requireTenant();
        return Map.of(
                "tenant_id",
                tenant.toString(),
                "message",
                "Wire this endpoint to operational metrics and tenant quotas.");
    }
}
