package com.jobocate.candidate.api;

import com.jobocate.candidate.application.ResumeService;
import com.jobocate.candidate.infrastructure.persistence.CandidateProfileEntity;
import com.jobocate.candidate.infrastructure.persistence.ResumeEntity;
import com.jobocate.candidate.infrastructure.persistence.ResumeParsedFieldsEntity;
import com.jobocate.candidate.infrastructure.persistence.ResumeParserStatus;
import com.jobocate.candidate.infrastructure.storage.ResumeStorage;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Candidate-facing resume endpoints. The OpenAPI surface lives in
 * {@code packages/shared-contracts/openapi/resume-api.yaml}; this controller
 * tracks that contract.
 *
 * <p>Until JWT-derived candidate identity lands (Prompt 24), the candidate
 * id is read from the {@code X-Jobocate-Candidate-Id} header for local-dev.
 */
@RestController
@RequestMapping("/api/v1/me/resumes")
public class MeResumeController {

    private final ResumeService service;

    public MeResumeController(ResumeService service) {
        this.service = service;
    }

    @PostMapping("/upload-url")
    @ResponseStatus(HttpStatus.CREATED)
    public UploadUrlResponse requestUploadUrl(
            @RequestHeader("X-Jobocate-Candidate-Id") UUID candidateId,
            @Valid @RequestBody UploadUrlRequest body) {
        ResumeService.ReservedUpload reserved =
                service.reserveUpload(candidateId, body.filename(), body.mimeType(), body.sizeBytes());
        return new UploadUrlResponse(
                reserved.resumeId(),
                reserved.target().uploadUrl(),
                reserved.target().objectKey(),
                reserved.target().expiresAt());
    }

    @PostMapping("/{id}/finalize")
    public ResumeResponse finalizeUpload(
            @RequestHeader("X-Jobocate-Candidate-Id") UUID candidateId,
            @PathVariable("id") UUID resumeId,
            @RequestBody(required = false) FinalizeRequest body) {
        FinalizeRequest safeBody = body == null ? new FinalizeRequest(null, false) : body;
        ResumeEntity row = service.finalizeUpload(
                candidateId, resumeId, safeBody.versionLabel(), Boolean.TRUE.equals(safeBody.setDefault()));
        return ResumeResponse.from(row);
    }

    @GetMapping
    public List<ResumeResponse> listMine(@RequestHeader("X-Jobocate-Candidate-Id") UUID candidateId) {
        return service.listMine(candidateId).stream().map(ResumeResponse::from).toList();
    }

    @GetMapping("/{id}")
    public ResumeResponse getOne(
            @RequestHeader("X-Jobocate-Candidate-Id") UUID candidateId,
            @PathVariable("id") UUID resumeId) {
        return ResumeResponse.from(service.get(candidateId, resumeId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-Jobocate-Candidate-Id") UUID candidateId,
            @PathVariable("id") UUID resumeId) {
        service.delete(candidateId, resumeId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/download-url")
    public SignedDownloadResponse signDownload(
            @RequestHeader("X-Jobocate-Candidate-Id") UUID candidateId,
            @PathVariable("id") UUID resumeId) {
        ResumeStorage.SignedDownload signed = service.signDownload(candidateId, resumeId);
        return new SignedDownloadResponse(signed.url(), signed.expiresAt());
    }

    @GetMapping("/{id}/parsed-fields")
    public ParsedFieldsResponse getParsed(
            @RequestHeader("X-Jobocate-Candidate-Id") UUID candidateId,
            @PathVariable("id") UUID resumeId) {
        ResumeParsedFieldsEntity row = service
                .parsedFields(candidateId, resumeId)
                .orElse(null);
        return ParsedFieldsResponse.from(resumeId, row);
    }

    @PostMapping("/{id}/parsed-fields/apply")
    public ResponseEntity<ApplyParsedResponse> applyParsed(
            @RequestHeader("X-Jobocate-Candidate-Id") UUID candidateId,
            @PathVariable("id") UUID resumeId) {
        CandidateProfileEntity profile = service.applyParsedFields(candidateId, resumeId);
        return ResponseEntity.ok(new ApplyParsedResponse(profile.getId(), Instant.now()));
    }

    @PostMapping("/{id}/parsed-fields/reject")
    public ResponseEntity<Void> rejectParsed(
            @RequestHeader("X-Jobocate-Candidate-Id") UUID candidateId,
            @PathVariable("id") UUID resumeId) {
        service.rejectParsedFields(candidateId, resumeId);
        return ResponseEntity.noContent().build();
    }

    public record UploadUrlRequest(
            @NotBlank String filename,
            @NotBlank String mimeType,
            @Positive @Min(1) long sizeBytes) {}

    public record FinalizeRequest(String versionLabel, Boolean setDefault) {}

    public record UploadUrlResponse(UUID resumeId, URI uploadUrl, String s3Key, Instant expiresAt) {}

    public record SignedDownloadResponse(URI url, Instant expiresAt) {}

    public record ApplyParsedResponse(UUID candidateProfileId, Instant appliedAt) {}

    public record ResumeResponse(
            UUID id,
            UUID candidateProfileId,
            String fileName,
            String mimeType,
            long sizeBytes,
            ResumeParserStatus parserStatus,
            Instant uploadedAt,
            Instant parsedAt,
            String parserError,
            boolean isDefault,
            String versionLabel) {

        static ResumeResponse from(ResumeEntity r) {
            return new ResumeResponse(
                    r.getId(),
                    r.getCandidateProfileId(),
                    r.getOriginalFilename(),
                    r.getMimeType(),
                    r.getSizeBytes(),
                    r.getParserStatus(),
                    r.getCreatedAt(),
                    r.getParsedAt(),
                    r.getParserError(),
                    r.isDefault(),
                    r.getVersionLabel());
        }
    }

    public record ParsedFieldsResponse(
            UUID resumeId,
            String fullName,
            String email,
            String phone,
            String locationCity,
            String locationRegion,
            String locationCountry,
            List<String> skills,
            BigDecimal totalExperienceYears,
            String parserVersion,
            Instant parsedAt,
            String reviewStatus) {

        static ParsedFieldsResponse from(UUID resumeId, ResumeParsedFieldsEntity row) {
            if (row == null) {
                return new ParsedFieldsResponse(
                        resumeId, null, null, null, null, null, null, List.of(), null, null, null, "PENDING");
            }
            return new ParsedFieldsResponse(
                    resumeId,
                    row.getFullName(),
                    row.getEmail(),
                    row.getPhone(),
                    row.getLocationCity(),
                    row.getLocationRegion(),
                    row.getLocationCountry(),
                    row.getSkills(),
                    row.getTotalExperienceYears(),
                    row.getParserVersion(),
                    row.getParsedAt(),
                    row.getReviewStatus().name());
        }
    }

}
