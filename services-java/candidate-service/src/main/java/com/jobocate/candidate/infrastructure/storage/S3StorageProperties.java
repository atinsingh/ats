package com.jobocate.candidate.infrastructure.storage;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.context.annotation.Configuration;

/** Bound from {@code jobocate.s3.*} properties. */
@Configuration
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
