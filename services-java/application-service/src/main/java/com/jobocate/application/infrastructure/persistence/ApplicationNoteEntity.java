package com.jobocate.application.infrastructure.persistence;

import com.jobocate.platform.persistence.AuditableEntity;
import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Access(AccessType.FIELD)
@Table(name = "application_notes")
public class ApplicationNoteEntity extends AuditableEntity {

    @Id
    private UUID id;

    @NotNull
    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @NotNull
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @NotNull
    @Column(name = "author_user_id", nullable = false)
    private UUID authorUserId;

    @NotBlank
    @Column(name = "body_md", nullable = false, columnDefinition = "text")
    private String bodyMd;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "mentioned_user_ids", nullable = false, columnDefinition = "uuid[]")
    private UUID[] mentionedUserIds = new UUID[0];

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public ApplicationNoteEntity() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(UUID applicationId) {
        this.applicationId = applicationId;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public UUID getAuthorUserId() {
        return authorUserId;
    }

    public void setAuthorUserId(UUID authorUserId) {
        this.authorUserId = authorUserId;
    }

    public String getBodyMd() {
        return bodyMd;
    }

    public void setBodyMd(String bodyMd) {
        this.bodyMd = bodyMd;
    }

    public UUID[] getMentionedUserIds() {
        return mentionedUserIds;
    }

    public void setMentionedUserIds(UUID[] mentionedUserIds) {
        this.mentionedUserIds = mentionedUserIds;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void markDeleted(Instant when) {
        this.deletedAt = when;
    }
}
