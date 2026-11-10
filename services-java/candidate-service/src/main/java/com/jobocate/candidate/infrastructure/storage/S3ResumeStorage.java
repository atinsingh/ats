package com.jobocate.candidate.infrastructure.storage;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

/**
 * S3 (or S3-compatible, e.g. MinIO) resume storage. Activated when
 * {@code jobocate.s3.enabled=true} (default) — set to {@code false} to fall
 * back to {@link InMemoryResumeStorage} for local-dev / tests.
 */
@Configuration
@ConditionalOnProperty(prefix = "jobocate.s3", name = "enabled", havingValue = "true", matchIfMissing = true)
public class S3ResumeStorage implements ResumeStorage {

    private final S3Client client;
    private final S3Presigner presigner;
    private final String bucket;
    private final Duration uploadTtl;
    private final Duration downloadTtl;

    public S3ResumeStorage(S3StorageProperties props) {
        var creds =
                AwsBasicCredentials.create(
                        nonNull(props.accessKey(), "S3 access key required"),
                        nonNull(props.secretKey(), "S3 secret key required"));
        var region = Region.of(props.region() == null ? "us-east-1" : props.region());
        var s3Config =
                S3Configuration.builder().pathStyleAccessEnabled(props.pathStyle()).build();
        var endpoint = props.endpoint() == null ? null : URI.create(props.endpoint());

        var clientBuilder = S3Client.builder()
                .credentialsProvider(StaticCredentialsProvider.create(creds))
                .region(region)
                .serviceConfiguration(s3Config);
        if (endpoint != null) {
            clientBuilder.endpointOverride(endpoint);
        }
        this.client = clientBuilder.build();

        var presignerBuilder = S3Presigner.builder()
                .credentialsProvider(StaticCredentialsProvider.create(creds))
                .region(region)
                .serviceConfiguration(s3Config);
        if (endpoint != null) {
            presignerBuilder.endpointOverride(endpoint);
        }
        this.presigner = presignerBuilder.build();

        this.bucket = nonNull(props.bucket(), "S3 bucket required");
        this.uploadTtl = props.uploadTtl();
        this.downloadTtl = props.downloadTtl();
    }

    @Override
    public UploadTarget createUploadTarget(
            UUID tenantId,
            UUID candidateId,
            UUID resumeId,
            String contentType,
            long contentLengthBytes,
            String originalFilename) {
        String objectKey = objectKey(tenantId, candidateId, resumeId, originalFilename);

        PutObjectRequest put = PutObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .contentType(contentType)
                .contentLength(contentLengthBytes)
                .build();

        PresignedPutObjectRequest signed =
                presigner.presignPutObject(
                        PutObjectPresignRequest.builder()
                                .signatureDuration(uploadTtl)
                                .putObjectRequest(put)
                                .build());

        return new UploadTarget(signed.url().toURI(), objectKey, signed.expiration());
    }

    @Override
    public SignedDownload createDownload(String objectKey, Duration ttl) {
        Duration effectiveTtl = ttl == null ? downloadTtl : ttl;
        GetObjectRequest get = GetObjectRequest.builder().bucket(bucket).key(objectKey).build();
        PresignedGetObjectRequest signed =
                presigner.presignGetObject(
                        GetObjectPresignRequest.builder()
                                .signatureDuration(effectiveTtl)
                                .getObjectRequest(get)
                                .build());
        return new SignedDownload(signed.url().toURI(), signed.expiration());
    }

    @Override
    public void deleteObject(String objectKey) {
        client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(objectKey).build());
    }

    private static String objectKey(UUID tenantId, UUID candidateId, UUID resumeId, String filename) {
        String safeName = (filename == null ? "resume" : filename).toLowerCase(Locale.ROOT);
        safeName = safeName.replaceAll("[^a-z0-9._-]", "_");
        String tenantSegment = tenantId == null ? "shared" : tenantId.toString();
        Instant when = Instant.now();
        return String.format(
                "tenants/%s/candidates/%s/resumes/%s/%d-%s",
                tenantSegment,
                candidateId,
                resumeId,
                when.getEpochSecond(),
                safeName);
    }

    private static String nonNull(String v, String err) {
        if (v == null || v.isBlank()) throw new IllegalStateException(err);
        return v;
    }
}
