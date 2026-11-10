package com.jobocate.candidate.application;

import com.jobocate.candidate.infrastructure.events.ResumeEventPublisher;
import com.jobocate.candidate.infrastructure.persistence.CandidateJpaRepository;
import com.jobocate.candidate.infrastructure.persistence.CandidateProfileEntity;
import com.jobocate.candidate.infrastructure.persistence.ResumeEntity;
import com.jobocate.candidate.infrastructure.persistence.ResumeJpaRepository;
import com.jobocate.candidate.infrastructure.persistence.ResumeParsedFieldsEntity;
import com.jobocate.candidate.infrastructure.persistence.ResumeParsedFieldsJpaRepository;
import com.jobocate.candidate.infrastructure.persistence.ResumeParserStatus;
import com.jobocate.candidate.infrastructure.persistence.ResumeProcessedEventEntity;
import com.jobocate.candidate.infrastructure.persistence.ResumeProcessedEventJpaRepository;
import com.jobocate.candidate.infrastructure.storage.ResumeStorage;
import com.jobocate.platform.tenant.TenantContext;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResumeService {

    private static final Logger log = LoggerFactory.getLogger(ResumeService.class);

    /** Per-PRD §3.9: PDF, DOC, DOCX. */
    private static final Set<String> ALLOWED_MIME = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    private static final long MAX_BYTES = 10L * 1024 * 1024;

    private final ResumeJpaRepository resumes;
    private final ResumeParsedFieldsJpaRepository parsedFields;
    private final ResumeProcessedEventJpaRepository processedEvents;
    private final CandidateJpaRepository candidates;
    private final ResumeStorage storage;
    private final ResumeEventPublisher events;

    public ResumeService(
            ResumeJpaRepository resumes,
            ResumeParsedFieldsJpaRepository parsedFields,
            ResumeProcessedEventJpaRepository processedEvents,
            CandidateJpaRepository candidates,
            ResumeStorage storage,
            ResumeEventPublisher events) {
        this.resumes = resumes;
        this.parsedFields = parsedFields;
        this.processedEvents = processedEvents;
        this.candidates = candidates;
        this.storage = storage;
        this.events = events;
    }

    @Transactional
    public ReservedUpload reserveUpload(
            UUID candidateId, String filename, String mimeType, long sizeBytes) {
        UUID tenantId = TenantContext.requireTenant();
        validate(filename, mimeType, sizeBytes);

        CandidateProfileEntity profile = candidates.findById(candidateId)
                .orElseThrow(() -> new ResumeException(ResumeException.Kind.NOT_FOUND, "candidate not found"));
        if (profile.getTenantId() != null && !profile.getTenantId().equals(tenantId)) {
            throw new ResumeException(ResumeException.Kind.NOT_FOUND, "candidate not found");
        }

        UUID resumeId = UUID.randomUUID();
        ResumeStorage.UploadTarget target = storage.createUploadTarget(
                tenantId, candidateId, resumeId, mimeType, sizeBytes, filename);

        ResumeEntity row = new ResumeEntity();
        row.setId(resumeId);
        row.setCandidateProfileId(candidateId);
        row.setTenantId(tenantId);
        row.setOriginalFilename(filename);
        row.setMimeType(mimeType);
        row.setSizeBytes(sizeBytes);
        row.setS3Key(target.objectKey());
        // parser_status defaults to PENDING; row stays in PENDING until finalize().
        resumes.save(row);

        return new ReservedUpload(resumeId, target);
    }

    @Transactional
    public ResumeEntity finalizeUpload(UUID candidateId, UUID resumeId, String versionLabel, boolean setDefault) {
        UUID tenantId = TenantContext.requireTenant();
        ResumeEntity row = ownedResume(tenantId, candidateId, resumeId);
        row.setVersionLabel(versionLabel);
        if (setDefault) {
            resumes.clearDefaultFor(candidateId);
            row.setDefault(true);
        }
        row.markInProgress();
        events.publishResumeUploaded(row);
        return row;
    }

    @Transactional(readOnly = true)
    public List<ResumeEntity> listMine(UUID candidateId) {
        UUID tenantId = TenantContext.requireTenant();
        // List then filter — avoids needing a tenant-aware repository method.
        return resumes.findByCandidateProfileIdOrderByCreatedAtDesc(candidateId).stream()
                .filter(r -> r.getTenantId() == null || r.getTenantId().equals(tenantId))
                .toList();
    }

    @Transactional(readOnly = true)
    public ResumeEntity get(UUID candidateId, UUID resumeId) {
        return ownedResume(TenantContext.requireTenant(), candidateId, resumeId);
    }

    @Transactional
    public void delete(UUID candidateId, UUID resumeId) {
        UUID tenantId = TenantContext.requireTenant();
        ResumeEntity row = ownedResume(tenantId, candidateId, resumeId);
        // Object deletion is best-effort — if S3 returns an error, we keep the
        // DB row so we don't orphan storage (TODO: lifecycle policy / janitor).
        try {
            storage.deleteObject(row.getS3Key());
        } catch (Exception ex) {
            log.warn("Resume storage delete failed: id={} err={}", resumeId, ex.getMessage());
        }
        resumes.delete(row);
        parsedFields.findByResumeId(resumeId).ifPresent(parsedFields::delete);
    }

    @Transactional
    public ResumeStorage.SignedDownload signDownload(UUID candidateId, UUID resumeId) {
        ResumeEntity row = ownedResume(TenantContext.requireTenant(), candidateId, resumeId);
        return storage.createDownload(row.getS3Key(), Duration.ofMinutes(5));
    }

    @Transactional(readOnly = true)
    public Optional<ResumeParsedFieldsEntity> parsedFields(UUID candidateId, UUID resumeId) {
        ownedResume(TenantContext.requireTenant(), candidateId, resumeId);
        return parsedFields.findByResumeId(resumeId);
    }

    /** Called by Kafka listener / internal HTTP endpoint with parser output. */
    @Transactional
    public void recordParsedFields(
            UUID eventId, UUID resumeId, ResumeParsedFieldsEntity proposed, boolean failed, String error) {
        if (eventId != null && processedEvents.existsByEventId(eventId)) {
            log.debug("Resume parser event {} already applied; skipping", eventId);
            return;
        }
        ResumeEntity row = resumes.findById(resumeId).orElse(null);
        if (row == null) {
            log.warn("Parser callback for unknown resume {}", resumeId);
            return;
        }
        if (failed) {
            row.markFailed(error == null ? "parser failure" : error);
        } else {
            row.markParsed(Instant.now());
            proposed.setResumeId(resumeId);
            proposed.setCandidateProfileId(row.getCandidateProfileId());
            parsedFields.save(proposed);
        }
        if (eventId != null) {
            processedEvents.save(new ResumeProcessedEventEntity(eventId, resumeId, Instant.now()));
        }
    }

    /** Apply parsed fields onto the candidate profile. */
    @Transactional
    public CandidateProfileEntity applyParsedFields(UUID candidateId, UUID resumeId) {
        UUID tenantId = TenantContext.requireTenant();
        ResumeEntity resume = ownedResume(tenantId, candidateId, resumeId);
        ResumeParsedFieldsEntity parsed = parsedFields.findByResumeId(resume.getId())
                .orElseThrow(() -> new ResumeException(ResumeException.Kind.NOT_FOUND, "parsed fields not available"));
        if (parsed.getReviewStatus() != ResumeParsedFieldsEntity.ReviewStatus.PROPOSED) {
            throw new ResumeException(ResumeException.Kind.ALREADY_REVIEWED, "parsed fields already reviewed");
        }

        CandidateProfileEntity profile = candidates.findById(candidateId)
                .orElseThrow(() -> new ResumeException(ResumeException.Kind.NOT_FOUND, "candidate not found"));

        if (parsed.getFullName() != null && !parsed.getFullName().isBlank()) {
            profile.setFullName(parsed.getFullName());
        }
        if (parsed.getLocationCity() != null) profile.setLocationCity(parsed.getLocationCity());
        if (parsed.getLocationRegion() != null) profile.setLocationRegion(parsed.getLocationRegion());
        if (parsed.getLocationCountry() != null) profile.setLocationCountry(parsed.getLocationCountry());

        parsed.markApplied(Instant.now());
        return profile;
    }

    @Transactional
    public void rejectParsedFields(UUID candidateId, UUID resumeId) {
        ResumeEntity resume = ownedResume(TenantContext.requireTenant(), candidateId, resumeId);
        parsedFields
                .findByResumeId(resume.getId())
                .ifPresent(p -> p.markRejected(Instant.now()));
    }

    private ResumeEntity ownedResume(UUID tenantId, UUID candidateId, UUID resumeId) {
        ResumeEntity row = resumes.findByIdAndCandidateProfileId(resumeId, candidateId)
                .orElseThrow(() -> new ResumeException(ResumeException.Kind.NOT_FOUND, "resume not found"));
        if (row.getTenantId() != null && !row.getTenantId().equals(tenantId)) {
            throw new ResumeException(ResumeException.Kind.NOT_FOUND, "resume not found");
        }
        return row;
    }

    private static void validate(String filename, String mimeType, long sizeBytes) {
        if (filename == null || filename.isBlank()) {
            throw new ResumeException(ResumeException.Kind.VALIDATION_FAILED, "filename required");
        }
        if (mimeType == null || !ALLOWED_MIME.contains(mimeType)) {
            throw new ResumeException(ResumeException.Kind.UNSUPPORTED_TYPE, "unsupported file type");
        }
        if (sizeBytes <= 0) {
            throw new ResumeException(ResumeException.Kind.VALIDATION_FAILED, "size must be positive");
        }
        if (sizeBytes > MAX_BYTES) {
            throw new ResumeException(ResumeException.Kind.FILE_TOO_LARGE, "max 10 MiB");
        }
    }

    public record ReservedUpload(UUID resumeId, ResumeStorage.UploadTarget target) {}
}
