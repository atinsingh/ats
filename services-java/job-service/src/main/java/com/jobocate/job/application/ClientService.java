package com.jobocate.job.application;

import com.jobocate.job.domain.JobErrorCodes;
import com.jobocate.job.domain.JobException;
import com.jobocate.job.domain.model.JobStatus;
import com.jobocate.job.infrastructure.persistence.ClientEntity;
import com.jobocate.job.infrastructure.persistence.ClientEntity.ClientStatus;
import com.jobocate.job.infrastructure.persistence.ClientJpaRepository;
import com.jobocate.platform.tenant.TenantContext;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Client companies, scoped to the tenant from trusted auth. */
@Service
public class ClientService {

    static final int MAX_LIMIT = 500;

    private final ClientJpaRepository clients;

    public ClientService(ClientJpaRepository clients) {
        this.clients = clients;
    }

    /** Null fields are left as they are. */
    public record ClientInput(
            String name,
            ClientStatus status,
            String channel,
            UUID ownerUserId,
            Instant lastContactAt,
            LocalDate msaEndsOn) {}

    public record ClientView(ClientEntity client, long openJobs) {}

    @Transactional(readOnly = true)
    public List<ClientView> list(ClientStatus status, int limit) {
        UUID tenant = TenantContext.requireTenant();
        PageRequest page = PageRequest.of(0, Math.min(Math.max(limit, 1), MAX_LIMIT));
        List<ClientEntity> rows =
                status == null
                        ? clients.findByTenantIdOrderByNameAsc(tenant, page)
                        : clients.findByTenantIdAndStatusOrderByNameAsc(tenant, status, page);
        Map<UUID, Long> open = openJobs(tenant, rows);
        return rows.stream()
                .map(c -> new ClientView(c, open.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public ClientView get(UUID id) {
        UUID tenant = TenantContext.requireTenant();
        ClientEntity c = load(tenant, id);
        return new ClientView(c, openJobs(tenant, List.of(c)).getOrDefault(c.getId(), 0L));
    }

    @Transactional
    public ClientView create(ClientInput in, UUID actorUserId) {
        UUID tenant = TenantContext.requireTenant();
        String name = requireName(in.name());
        if (clients.existsByTenantIdAndNameIgnoreCase(tenant, name)) {
            throw duplicate(name);
        }
        ClientEntity c = new ClientEntity(UUID.randomUUID(), tenant, name);
        apply(c, in);
        c.setCreatedByUserId(actorUserId);
        c.setUpdatedByUserId(actorUserId);
        return new ClientView(clients.save(c), 0L);
    }

    @Transactional
    public ClientView update(UUID id, ClientInput in, UUID actorUserId) {
        UUID tenant = TenantContext.requireTenant();
        ClientEntity c = load(tenant, id);
        if (in.name() != null) {
            String name = requireName(in.name());
            if (clients.existsByTenantIdAndNameIgnoreCaseAndIdNot(tenant, name, id)) {
                throw duplicate(name);
            }
            c.setName(name);
        }
        apply(c, in);
        c.setUpdatedByUserId(actorUserId);
        ClientEntity saved = clients.save(c);
        return new ClientView(saved, openJobs(tenant, List.of(saved)).getOrDefault(id, 0L));
    }

    private static void apply(ClientEntity c, ClientInput in) {
        if (in.status() != null) c.setStatus(in.status());
        if (in.channel() != null && !in.channel().isBlank()) c.setChannel(in.channel().trim());
        if (in.ownerUserId() != null) c.setOwnerUserId(in.ownerUserId());
        if (in.lastContactAt() != null) c.setLastContactAt(in.lastContactAt());
        if (in.msaEndsOn() != null) c.setMsaEndsOn(in.msaEndsOn());
    }

    private Map<UUID, Long> openJobs(UUID tenant, List<ClientEntity> rows) {
        Map<UUID, Long> out = new HashMap<>();
        if (rows.isEmpty()) return out;
        for (Object[] r :
                clients.countJobsByClient(
                        tenant,
                        JobStatus.PUBLISHED,
                        rows.stream().map(ClientEntity::getId).toList())) {
            out.put((UUID) r[0], ((Number) r[1]).longValue());
        }
        return out;
    }

    private ClientEntity load(UUID tenant, UUID id) {
        return clients
                .findByTenantIdAndId(tenant, id)
                .orElseThrow(
                        () ->
                                new JobException(
                                        JobErrorCodes.CLIENT_NOT_FOUND,
                                        HttpStatus.NOT_FOUND,
                                        "Client not found"));
    }

    private static String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new JobException(
                    JobErrorCodes.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, "A client needs a name");
        }
        String trimmed = name.trim();
        if (trimmed.length() > 256) {
            throw new JobException(
                    JobErrorCodes.VALIDATION_FAILED,
                    HttpStatus.BAD_REQUEST,
                    "A client name can be at most 256 characters");
        }
        return trimmed;
    }

    private static JobException duplicate(String name) {
        return new JobException(
                JobErrorCodes.CLIENT_DUPLICATE,
                HttpStatus.CONFLICT,
                "A client named " + name + " already exists");
    }
}
