package com.jobocate.candidate.infrastructure.storage;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Bound from {@code jobocate.s3.*} properties. Registered by {@code CandidateServiceApplication};
 * a record cannot be a {@code @Configuration} class because it is final.
 */
@ConfigurationProperties(prefix = "jobocate.s3")
public record S3StorageProperties(
        @DefaultValue("true") boolean enabled,
        String endpoint,
        String region,
        String accessKey,
        String secretKey,
        String bucket,
        @DefaultValue("true") boolean pathStyle,
        @DefaultValue("PT15M") Duration uploadTtl,
        @DefaultValue("PT5M") Duration downloadTtl) {}
