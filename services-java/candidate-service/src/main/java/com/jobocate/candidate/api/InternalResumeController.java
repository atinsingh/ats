package com.jobocate.candidate.api;

import com.jobocate.candidate.application.ResumeService;
import com.jobocate.candidate.infrastructure.persistence.ResumeParsedFieldsEntity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

/**
 * Internal callback endpoint for the resume-parser-worker (Python). Protected
 * by a shared bearer token (jobocate.internal-token). Production should swap
 * this for mTLS / SPIFFE.
 */
@RestController
@RequestMapping("/internal/v1/resumes")
public class InternalResumeController {

    private final ResumeService service;
    private final String expectedToken;

    public InternalResumeController(
            ResumeService service,
            @Value("${jobocate.internal-token:}") String expectedToken) {
        this.service = service;
        this.expectedToken = expectedToken == null ? "" : expectedToken;
    }

    @PostMapping("/{id}/parsed")
    public ResponseEntity<Void> recordParsed(
            @PathVariable("id") UUID resumeId,
            @RequestHeader(value = "Authorization", required = false) String auth,
            @Valid @RequestBody ParsedFieldsCallback body) {
        authorize(auth);
        boolean failed = Boolean.TRUE.equals(body.failed());
        ResumeParsedFieldsEntity proposed = new ResumeParsedFieldsEntity();
        if (!failed) {
            proposed.setFullName(body.fullName());
            proposed.setEmail(body.email());
            proposed.setPhone(body.phone());
            proposed.setLocationCity(body.locationCity());
            proposed.setLocationRegion(body.locationRegion());
            proposed.setLocationCountry(body.locationCountry());
            proposed.setSkills(body.skills() == null ? List.of() : body.skills());
            proposed.setTotalExperienceYears(body.totalExperienceYears());
            proposed.setParsedText(body.parsedText());
            proposed.setStructured(body.structured() == null ? Map.of() : body.structured());
            proposed.setParserVersion(body.parserVersion());
        }
        service.recordParsedFields(body.eventId(), resumeId, proposed, failed, body.error());
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    private void authorize(String authHeader) {
        if (expectedToken.isBlank()) {
            return; // dev: open. Configure jobocate.internal-token in prod.
        }
        if (authHeader == null || !authHeader.equals("Bearer " + expectedToken)) {
            throw new AccessDeniedException("invalid internal token");
        }
    }

    public record ParsedFieldsCallback(
            @NotNull UUID eventId,
            Boolean failed,
            String error,
            String fullName,
            String email,
            String phone,
            String locationCity,
            String locationRegion,
            String locationCountry,
            List<String> skills,
            BigDecimal totalExperienceYears,
            String parsedText,
            Map<String, Object> structured,
            String parserVersion) {}
}
