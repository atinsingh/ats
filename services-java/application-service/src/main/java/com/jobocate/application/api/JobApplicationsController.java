package com.jobocate.application.api;

import com.jobocate.application.api.ApplicationController.ApplicationResponse;
import com.jobocate.application.application.ApplicationService;
import com.jobocate.application.infrastructure.persistence.ApplicationStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Recruiter list of one job's applications. Tenant comes from trusted auth only. */
@RestController
public class JobApplicationsController {

    static final int MAX_LIMIT = 500;

    private final ApplicationService applications;

    public JobApplicationsController(ApplicationService applications) {
        this.applications = applications;
    }

    @GetMapping("/api/v1/jobs/{jobId}/applications")
    public List<ApplicationResponse> list(
            @PathVariable("jobId") UUID jobId,
            @RequestParam(value = "status", required = false) ApplicationStatus status,
            @RequestParam(value = "limit", defaultValue = "100") int limit) {
        return applications
                .listForJob(jobId, status, Math.min(Math.max(limit, 1), MAX_LIMIT))
                .stream()
                .map(ApplicationResponse::from)
                .toList();
    }
}
