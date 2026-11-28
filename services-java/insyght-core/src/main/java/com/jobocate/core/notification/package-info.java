/**
 * Notification module. Email and in-app notifications. Moves from notification-service.
 *
 * <p>Other modules may use only the types in this package. Subpackages are internal and
 * {@code ApplicationModules.verify()} fails the build if another module reaches into them.
 * See ADR-0001.
 */
@ApplicationModule(displayName = "Notification")
package com.jobocate.core.notification;

import org.springframework.modulith.ApplicationModule;
