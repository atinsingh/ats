package com.jobocate.candidate.infrastructure.storage;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * Stand-in storage used in tests / local-dev when S3 isn't configured.
 * Returns deterministic URIs that the upload/download UIs can render but
 * cannot actually upload to — set {@code jobocate.s3.enabled=true} for the
 * real flow.
 */
@Configuration
@ConditionalOnProperty(prefix = "jobocate.s3", name = "enabled", havingValue = "false")
public class InMemoryResumeStorage implements ResumeStorage {

    @Override
    public UploadTarget createUploadTarget(
            UUID tenantId,
            UUID candidateId,
            UUID resumeId,
            String contentType,
            long contentLengthBytes,
            String originalFilename) {
        String key = "in-memory/" + candidateId + "/" + resumeId + "/" + originalFilename;
        return new UploadTarget(URI.create("about:blank?key=" + key), key, Instant.now().plus(Duration.ofMinutes(15)));
    }

    @Override
    public SignedDownload createDownload(String objectKey, Duration ttl) {
        return new SignedDownload(URI.create("about:blank?key=" + objectKey), Instant.now().plus(ttl == null ? Duration.ofMinutes(5) : ttl));
    }

    @Override
    public void deleteObject(String objectKey) {
        // no-op
    }
}
