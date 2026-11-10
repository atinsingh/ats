package com.jobocate.job.api;

import com.jobocate.job.application.JobCommandService;
import com.jobocate.job.application.JobCommandService.JobInput;
import com.jobocate.job.domain.JobErrorCodes;
import com.jobocate.job.domain.JobException;
import com.jobocate.job.domain.model.Job;
import com.jobocate.job.domain.model.JobStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/jobs")
public class JobController {

    private final JobCommandService jobs;

    public JobController(JobCommandService jobs) {
        this.jobs = jobs;
    }

    @GetMapping
    public List<JobResponse> list(
            @RequestParam(name = "limit", defaultValue = "25") int limit,
            @RequestParam(name = "offset", defaultValue = "0") int offset) {
        return jobs.listPublishedJobs(limit, offset).stream().map(JobResponse::from).toList();
    }

    @GetMapping("/{id}")
    public JobResponse get(@PathVariable("id") UUID id) {
        return jobs.get(id)
                .map(JobResponse::from)
                .orElseThrow(
                        () ->
                                new JobException(
                                        JobErrorCodes.JOB_NOT_FOUND,
                                        HttpStatus.NOT_FOUND,
                                        "Job not found"));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JobResponse create(@Valid @RequestBody CreateJobRequest request) {
        Job created = jobs.createDraft(request.toInput(), null);
        return JobResponse.from(created);
    }

    @PatchMapping("/{id}")
    public JobResponse update(
            @PathVariable("id") UUID id, @RequestBody UpdateJobRequest request) {
        Job updated = jobs.updateJob(id, request.toInput(), null);
        return JobResponse.from(updated);
    }

    @PostMapping("/{id}/publish")
    public JobResponse publish(@PathVariable("id") UUID id) {
        return JobResponse.from(jobs.publish(id, null));
    }

    @PostMapping("/{id}/unpublish")
    public JobResponse unpublish(@PathVariable("id") UUID id) {
        return JobResponse.from(jobs.unpublish(id, null));
    }

    @PostMapping("/{id}/close")
    public JobResponse close(@PathVariable("id") UUID id) {
        return JobResponse.from(jobs.close(id, null));
    }

    @PostMapping("/{id}/clone")
    public ResponseEntity<JobResponse> clone(@PathVariable("id") UUID id) {
        Job clone = jobs.clone(id, null);
        return ResponseEntity.created(java.net.URI.create("/api/v1/jobs/" + clone.id()))
                .body(JobResponse.from(clone));
    }

    public record CreateJobRequest(
            @NotBlank String title,
            String department,
            String description,
            String responsibilities,
            String qualifications,
            String employmentType,
            String remotePolicy,
            Integer experienceMinYears,
            Integer experienceMaxYears,
            Long salaryMinCents,
            Long salaryMaxCents,
            String currencyCode,
            String location,
            String locationCity,
            String locationRegion,
            String locationCountry,
            UUID organizationId,
            UUID pipelineId,
            List<String> skills) {
        JobInput toInput() {
            return new JobInput(
                    title,
                    department,
                    description,
                    responsibilities,
                    qualifications,
                    employmentType,
                    remotePolicy,
                    experienceMinYears,
                    experienceMaxYears,
                    salaryMinCents,
                    salaryMaxCents,
                    currencyCode,
                    location,
                    locationCity,
                    locationRegion,
                    locationCountry,
                    organizationId,
                    pipelineId,
                    skills);
        }
    }

    public record UpdateJobRequest(
            String title,
            String department,
            String description,
            String responsibilities,
            String qualifications,
            String employmentType,
            String remotePolicy,
            Integer experienceMinYears,
            Integer experienceMaxYears,
            Long salaryMinCents,
            Long salaryMaxCents,
            String currencyCode,
            String location,
            String locationCity,
            String locationRegion,
            String locationCountry,
            UUID organizationId,
            UUID pipelineId,
            List<String> skills) {
        JobInput toInput() {
            return new JobInput(
                    title,
                    department,
                    description,
                    responsibilities,
                    qualifications,
                    employmentType,
                    remotePolicy,
                    experienceMinYears,
                    experienceMaxYears,
                    salaryMinCents,
                    salaryMaxCents,
                    currencyCode,
                    location,
                    locationCity,
                    locationRegion,
                    locationCountry,
                    organizationId,
                    pipelineId,
                    skills);
        }
    }

    public record JobResponse(
            UUID id,
            UUID tenantId,
            String slug,
            String title,
            String department,
            String description,
            String employmentType,
            String remotePolicy,
            JobStatus status,
            Long salaryMinCents,
            Long salaryMaxCents,
            String currencyCode,
            String location,
            Instant publishedAt,
            Instant closedAt,
            List<String> skills) {
        static JobResponse from(Job j) {
            return new JobResponse(
                    j.id(),
                    j.tenantId(),
                    j.slug(),
                    j.title(),
                    j.department(),
                    j.description(),
                    j.employmentType(),
                    j.remotePolicy(),
                    j.status(),
                    j.salaryMinCents(),
                    j.salaryMaxCents(),
                    j.currencyCode(),
                    j.location(),
                    j.publishedAt(),
                    j.closedAt(),
                    j.skills());
        }
    }
}
