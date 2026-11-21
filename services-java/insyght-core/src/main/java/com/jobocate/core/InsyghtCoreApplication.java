package com.jobocate.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * The Java backend as one modular monolith (ADR-0001).
 *
 * <p>Each direct subpackage is a Spring Modulith application module. Boundaries are enforced by
 * {@code ModularityTest}, not by separate processes.
 */
@SpringBootApplication
public class InsyghtCoreApplication {

    public static void main(String[] args) {
        SpringApplication.run(InsyghtCoreApplication.class, args);
    }
}
