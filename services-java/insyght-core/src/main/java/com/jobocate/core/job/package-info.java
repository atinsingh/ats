/**
 * Job module. Job requisitions and postings. Moves from job-service.
 *
 * <p>Other modules may use only the types in this package. Subpackages are internal and
 * {@code ApplicationModules.verify()} fails the build if another module reaches into them.
 * See ADR-0001.
 */
@ApplicationModule(displayName = "Job")
package com.jobocate.core.job;

import org.springframework.modulith.ApplicationModule;
