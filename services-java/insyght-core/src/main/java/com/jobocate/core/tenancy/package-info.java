/**
 * Tenancy module. Tenants, workspaces and tenant settings. Moves from ats-core-service.
 *
 * <p>Other modules may use only the types in this package. Subpackages are internal and
 * {@code ApplicationModules.verify()} fails the build if another module reaches into them.
 * See ADR-0001.
 */
@ApplicationModule(displayName = "Tenancy")
package com.jobocate.core.tenancy;

import org.springframework.modulith.ApplicationModule;
