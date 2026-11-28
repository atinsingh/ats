package com.jobocate.job.infrastructure.persistence;

import com.jobocate.platform.persistence.AuditableEntity;
import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** A company the firm places with or is pitching. Tenant-scoped. */
@Entity
@Access(AccessType.FIELD)
@Table(name = "clients")
public class ClientEntity extends AuditableEntity {

    public enum ClientStatus {
        ACTIVE,
        DORMANT,
        PROSPECT
    }

    @Id private UUID id;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClientStatus status = ClientStatus.PROSPECT;

    @Column(nullable = false)
    private String channel = "Direct";

    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    @Column(name = "last_contact_at")
    private Instant lastContactAt;

    @Column(name = "msa_ends_on")
    private LocalDate msaEndsOn;

    protected ClientEntity() {}

    public ClientEntity(UUID id, UUID tenantId, String name) {
        this.id = id;
        this.tenantId = tenantId;
        this.name = name;
    }

    public UUID getId() {
        return id;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ClientStatus getStatus() {
        return status;
    }

    public void setStatus(ClientStatus status) {
        this.status = status;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public UUID getOwnerUserId() {
        return ownerUserId;
    }

    public void setOwnerUserId(UUID ownerUserId) {
        this.ownerUserId = ownerUserId;
    }

    public Instant getLastContactAt() {
        return lastContactAt;
    }

    public void setLastContactAt(Instant lastContactAt) {
        this.lastContactAt = lastContactAt;
    }

    public LocalDate getMsaEndsOn() {
        return msaEndsOn;
    }

    public void setMsaEndsOn(LocalDate msaEndsOn) {
        this.msaEndsOn = msaEndsOn;
    }
}
