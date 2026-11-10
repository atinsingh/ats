package com.jobocate.application.api;

import com.jobocate.application.application.AiArtifactService;
import com.jobocate.application.application.AiArtifactService.RecordResultCommand;
import com.jobocate.application.api.AiArtifactController.ArtifactResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Worker-only callback endpoints. Protected by a static bearer token shared
 * between the Java service and the python AI workers via
 * {@code jobocate.internal-token}; replaced by mTLS / SPIFFE in production.
 */
@RestController
@RequestMapping("/internal/v1/ai-artifacts")
public class InternalAiArtifactController {

    private final AiArtifactService service;
    private final String expectedToken;

    public InternalAiArtifactController(
            AiArtifactService service,
            @Value("${jobocate.internal-token:jobocate-internal-dev-token}") String token) {
        this.service = service;
        this.expectedToken = token;
    }

    @PostMapping("/{id}/result")
    public ResponseEntity<ArtifactResponse> recordSuccess(
            @PathVariable("id") UUID id,
            @RequestHeader(value = "X-Jobocate-Tenant-Id") UUID tenantId,
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestHeader(value = "X-Correlation-Id", required = false) UUID correlationId,
            @Valid @RequestBody RecordResultBody body) {
        if (!authorized(auth)) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(
                ArtifactResponse.from(
                        service.recordSuccess(
                                tenantId,
                                id,
                                new RecordResultCommand(
                                        body.outputText(),
                                        body.outputS3Key(),
                                        body.modelVersion(),
                                        body.promptVersion(),
                                        body.idempotencyKey(),
                                        correlationId))));
    }

    @PostMapping("/{id}/failure")
    public ResponseEntity<ArtifactResponse> recordFailure(
            @PathVariable("id") UUID id,
            @RequestHeader(value = "X-Jobocate-Tenant-Id") UUID tenantId,
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestHeader(value = "X-Correlation-Id", required = false) UUID correlationId,
            @RequestBody(required = false) FailureBody body) {
        if (!authorized(auth)) {
            return ResponseEntity.status(401).build();
        }
        String reason = body == null ? null : body.reason();
        return ResponseEntity.ok(
                ArtifactResponse.from(service.recordFailure(tenantId, id, reason, correlationId)));
    }

    private boolean authorized(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            return false;
        }
        return header.substring("Bearer ".length()).equals(expectedToken);
    }

    public record RecordResultBody(
            String outputText,
            String outputS3Key,
            String modelVersion,
            String promptVersion,
            String idempotencyKey) {}

    public record FailureBody(@NotNull String reason) {}
}
