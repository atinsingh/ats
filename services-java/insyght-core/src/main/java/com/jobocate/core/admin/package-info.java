/**
 * Admin module. Feature flags, quotas, prompt registry and audit query. Moves from admin-service.
 *
 * <p>Other modules may use only the types in this package. Subpackages are internal and
 * {@code ApplicationModules.verify()} fails the build if another module reaches into them.
 * See ADR-0001.
 */
@ApplicationModule(displayName = "Admin")
package com.jobocate.core.admin;

import org.springframework.modulith.ApplicationModule;
