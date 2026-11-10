package com.jobocate.candidate.infrastructure.storage;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/** Issues pre-signed URLs for direct S3 PUT/GET against resume objects. */
public interface ResumeStorage {

    UploadTarget createUploadTarget(
            UUID tenantId,
            UUID candidateId,
            UUID resumeId,
            String contentType,
            long contentLengthBytes,
            String originalFilename);

    SignedDownload createDownload(String objectKey, Duration ttl);

    void deleteObject(String objectKey);

    record UploadTarget(URI uploadUrl, String objectKey, Instant expiresAt) {}

    record SignedDownload(URI url, Instant expiresAt) {}
}
