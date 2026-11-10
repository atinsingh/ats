package com.jobocate.auth.infrastructure.persistence;

import com.jobocate.platform.persistence.AuditableEntity;
import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

/** JPA entity for the global {@code users} table. Owned by tenant-auth-service. */
@Entity
@Access(AccessType.FIELD)
@Table(name = "users")
public class UserEntity extends AuditableEntity {

    @Id
    private UUID id;

    @NotBlank
    @Email
    @Size(max = 320)
    @Column(nullable = false)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "mfa_enabled", nullable = false)
    private boolean mfaEnabled;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "failed_login_count", nullable = false)
    private int failedLoginCount;

    @Size(max = 256)
    @Column(name = "display_name")
    private String displayName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "time_zone", length = 64, nullable = false)
    private String timeZone = "UTC";

    @Column(length = 16, nullable = false)
    private String locale = "en-US";

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public UserEntity() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Instant getEmailVerifiedAt() {
        return emailVerifiedAt;
    }

    public void markEmailVerified(Instant when) {
        this.emailVerifiedAt = when;
    }

    public boolean isMfaEnabled() {
        return mfaEnabled;
    }

    public void setMfaEnabled(boolean mfaEnabled) {
        this.mfaEnabled = mfaEnabled;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void touchLastLogin(Instant when) {
        this.lastLoginAt = when;
    }

    public Instant getLockedUntil() {
        return lockedUntil;
    }

    public void lockUntil(Instant until) {
        this.lockedUntil = until;
    }

    public int getFailedLoginCount() {
        return failedLoginCount;
    }

    public void incrementFailedLoginCount() {
        this.failedLoginCount++;
    }

    public void resetFailedLoginCount() {
        this.failedLoginCount = 0;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void markDeleted(Instant when) {
        this.deletedAt = when;
    }
}
