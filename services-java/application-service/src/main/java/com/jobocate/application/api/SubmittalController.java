package com.jobocate.application.api;

import com.jobocate.application.application.SubmittalService;
import com.jobocate.application.application.SubmittalService.CreateCommand;
import com.jobocate.application.infrastructure.persistence.SubmittalEntity;
import com.jobocate.application.infrastructure.persistence.SubmittalEntity.SubmittalStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Submittals. Recruiter roles only; see SecurityConfig. Nothing here contacts a client. */
@RestController
@RequestMapping("/api/v1/submittals")
public class SubmittalController {

    private static final String USER = "X-Jobocate-User-Id";

    private final SubmittalService service;

    public SubmittalController(SubmittalService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SubmittalResponse create(
            @RequestBody CreateRequest body,
            @RequestHeader(value = USER, required = false) UUID actor) {
        return SubmittalResponse.from(
                service.create(
                        new CreateCommand(
                                body.applicationId(),
                                body.clientId(),
                                body.channel(),
                                body.billRate(),
                                body.ownerUserId()),
                        actor));
    }

    @GetMapping
    public List<SubmittalResponse> list(
            @RequestParam(name = "status", required = false) SubmittalStatus status,
            @RequestParam(name = "limit", defaultValue = "200") int limit) {
        return service.list(status, limit).stream().map(SubmittalResponse::from).toList();
    }

    @GetMapping("/{id}")
    public SubmittalResponse get(@PathVariable("id") UUID id) {
        return SubmittalResponse.from(service.get(id));
    }

    @PostMapping("/{id}/approve")
    public SubmittalResponse approve(
            @PathVariable("id") UUID id,
            @RequestHeader(value = USER, required = false) UUID actor) {
        return SubmittalResponse.from(service.approve(id, actor));
    }

    @PostMapping("/{id}/client-update")
    public SubmittalResponse clientUpdate(
            @PathVariable("id") UUID id,
            @RequestBody ClientUpdateRequest body,
            @RequestHeader(value = USER, required = false) UUID actor) {
        return SubmittalResponse.from(
                service.recordClientUpdate(id, body.status(), body.note(), actor));
    }

    @PostMapping("/{id}/withdraw")
    public SubmittalResponse withdraw(
            @PathVariable("id") UUID id,
            @RequestBody(required = false) WithdrawRequest body,
            @RequestHeader(value = USER, required = false) UUID actor) {
        return SubmittalResponse.from(
                service.withdraw(id, body != null ? body.reason() : null, actor));
    }

    public record CreateRequest(
            UUID applicationId,
            UUID clientId,
            String channel,
            BigDecimal billRate,
            UUID ownerUserId) {}

    public record ClientUpdateRequest(SubmittalStatus status, String note) {}

    public record WithdrawRequest(String reason) {}

    public record SubmittalResponse(
            UUID id,
            UUID applicationId,
            UUID jobId,
            UUID candidateProfileId,
            UUID clientId,
            String channel,
            SubmittalStatus status,
            BigDecimal billRate,
            UUID ownerUserId,
            UUID approvedByUserId,
            Instant submittedAt,
            Instant lastClientActivityAt,
            String latestNote,
            Instant createdAt) {
        static SubmittalResponse from(SubmittalEntity s) {
            return new SubmittalResponse(
                    s.getId(),
                    s.getApplicationId(),
                    s.getJobId(),
                    s.getCandidateProfileId(),
                    s.getClientId(),
                    s.getChannel(),
                    s.getStatus(),
                    s.getBillRate(),
                    s.getOwnerUserId(),
                    s.getApprovedByUserId(),
                    s.getSubmittedAt(),
                    s.getLastClientActivityAt(),
                    s.getLatestNote(),
                    s.getCreatedAt());
        }
    }
}
