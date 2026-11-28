/**
 * Identity module. Users, roles, sign-in and service credentials. Moves from tenant-auth-service (IATS-136 to IATS-142).
 *
 * <p>Other modules may use only the types in this package. Subpackages are internal and
 * {@code ApplicationModules.verify()} fails the build if another module reaches into them.
 * See ADR-0001.
 */
@ApplicationModule(displayName = "Identity")
package com.jobocate.core.identity;

import org.springframework.modulith.ApplicationModule;
