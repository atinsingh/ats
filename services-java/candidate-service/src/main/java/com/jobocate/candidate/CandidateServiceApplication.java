package com.jobocate.candidate;

import org.springframework.boot.SpringApplication;
import com.jobocate.candidate.infrastructure.storage.S3StorageProperties;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(S3StorageProperties.class)
public class CandidateServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(CandidateServiceApplication.class, args);
    }
}
