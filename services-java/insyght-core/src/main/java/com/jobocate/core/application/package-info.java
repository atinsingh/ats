/**
 * Application module. Applications, pipelines, interviews, offers and AI artifacts. Moves from application-service.
 *
 * <p>Other modules may use only the types in this package. Subpackages are internal and
 * {@code ApplicationModules.verify()} fails the build if another module reaches into them.
 * See ADR-0001.
 */
@ApplicationModule(displayName = "Application")
package com.jobocate.core.application;

import org.springframework.modulith.ApplicationModule;
