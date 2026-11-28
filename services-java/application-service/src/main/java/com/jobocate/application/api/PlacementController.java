package com.jobocate.application.api;

import com.jobocate.application.application.PlacementService;
import com.jobocate.application.application.PlacementService.CreateCommand;
import com.jobocate.application.application.PlacementService.UpdateCommand;
import com.jobocate.application.infrastructure.persistence.PlacementEntity;
import com.jobocate.application.infrastructure.persistence.PlacementEntity.Extension;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Placements. Recruiter roles only; see SecurityConfig. */
@RestController
@RequestMapping("/api/v1/placements")
public class PlacementController {

    private static final String USER = "X-Jobocate-User-Id";

    private final PlacementService service;

    public PlacementController(PlacementService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlacementResponse create(
            @RequestBody CreateRequest body,
            @RequestHeader(value = USER, required = false) UUID actor) {
        return PlacementResponse.from(
                service.create(
                        new CreateCommand(
                                body.applicationId(),
                                body.clientId(),
                                body.startDate(),
                                body.endDate(),
                                body.billRate(),
                                body.payRate(),
                                body.ownerUserId()),
                        actor));
    }

    @GetMapping
    public List<PlacementResponse> list(
            @RequestParam(name = "limit", defaultValue = "200") int limit) {
        return service.list(limit).stream().map(PlacementResponse::from).toList();
    }

    @GetMapping("/{id}")
    public PlacementResponse get(@PathVariable("id") UUID id) {
        return PlacementResponse.from(service.get(id));
    }

    @PatchMapping("/{id}")
    public PlacementResponse update(
            @PathVariable("id") UUID id,
            @RequestBody UpdateRequest body,
            @RequestHeader(value = USER, required = false) UUID actor) {
        return PlacementResponse.from(
                service.update(
                        id,
                        new UpdateCommand(
                                body.endDate(), body.billRate(), body.payRate(), body.extension()),
                        actor));
    }

    public record CreateRequest(
            UUID applicationId,
            UUID clientId,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal billRate,
            BigDecimal payRate,
            UUID ownerUserId) {}

    public record UpdateRequest(
            LocalDate endDate, BigDecimal billRate, BigDecimal payRate, Extension extension) {}

    public record PlacementResponse(
            UUID id,
            UUID applicationId,
            UUID jobId,
            UUID candidateProfileId,
            UUID clientId,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal billRate,
            BigDecimal payRate,
            Extension extension,
            UUID ownerUserId,
            Instant createdAt) {
        static PlacementResponse from(PlacementEntity p) {
            return new PlacementResponse(
                    p.getId(),
                    p.getApplicationId(),
                    p.getJobId(),
                    p.getCandidateProfileId(),
                    p.getClientId(),
                    p.getStartDate(),
                    p.getEndDate(),
                    p.getBillRate(),
                    p.getPayRate(),
                    p.getExtension(),
                    p.getOwnerUserId(),
                    p.getCreatedAt());
        }
    }
}
