/**
 * Search projection module. Builds search documents for the Go search-gateway. Moves from search-orchestrator-service.
 *
 * <p>Other modules may use only the types in this package. Subpackages are internal and
 * {@code ApplicationModules.verify()} fails the build if another module reaches into them.
 * See ADR-0001.
 */
@ApplicationModule(displayName = "Search projection")
package com.jobocate.core.searchprojection;

import org.springframework.modulith.ApplicationModule;
