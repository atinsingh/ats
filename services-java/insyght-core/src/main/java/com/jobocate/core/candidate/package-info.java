/**
 * Candidate module. Candidate profiles and resumes. Moves from candidate-service.
 *
 * <p>Other modules may use only the types in this package. Subpackages are internal and
 * {@code ApplicationModules.verify()} fails the build if another module reaches into them.
 * See ADR-0001.
 */
@ApplicationModule(displayName = "Candidate")
package com.jobocate.core.candidate;

import org.springframework.modulith.ApplicationModule;
