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
import jakarta.validation.constraints.Size;
import java.util.UUID;

@Entity
@Access(AccessType.FIELD)
@Table(name = "pipeline_stages")
public class PipelineStageEntity extends AuditableEntity {

    @Id
    private UUID id;

    @NotNull
    @Column(name = "pipeline_id", nullable = false)
    private UUID pipelineId;

    @NotNull
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private int position;

    @NotBlank
    @Size(max = 128)
    @Column(nullable = false)
    private String name;

    @Size(max = 16)
    @Column private String color;

    @Size(max = 32)
    @Column(name = "application_status")
    private String applicationStatus;

    @Column(name = "is_disabled", nullable = false)
    private boolean disabled;

    public PipelineStageEntity() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getPipelineId() {
        return pipelineId;
    }

    public void setPipelineId(UUID pipelineId) {
        this.pipelineId = pipelineId;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isDisabled() {
        return disabled;
    }

    public void setDisabled(boolean disabled) {
        this.disabled = disabled;
    }
}
