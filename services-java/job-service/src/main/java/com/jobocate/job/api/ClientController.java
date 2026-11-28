package com.jobocate.job.api;

import com.jobocate.job.application.ClientService;
import com.jobocate.job.application.ClientService.ClientInput;
import com.jobocate.job.application.ClientService.ClientView;
import com.jobocate.job.infrastructure.persistence.ClientEntity.ClientStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Client companies. Recruiter roles only; see SecurityConfig. */
@RestController
@RequestMapping("/api/v1/clients")
public class ClientController {

    private final ClientService clients;

    public ClientController(ClientService clients) {
        this.clients = clients;
    }

    @GetMapping
    public List<ClientResponse> list(
            @RequestParam(name = "status", required = false) ClientStatus status,
            @RequestParam(name = "limit", defaultValue = "200") int limit) {
        return clients.list(status, limit).stream().map(ClientResponse::from).toList();
    }

    @GetMapping("/{id}")
    public ClientResponse get(@PathVariable("id") UUID id) {
        return ClientResponse.from(clients.get(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClientResponse create(
            @RequestBody ClientRequest body,
            @RequestHeader(value = "X-Jobocate-User-Id", required = false) UUID actor) {
        return ClientResponse.from(clients.create(body.toInput(), actor));
    }

    @PatchMapping("/{id}")
    public ClientResponse update(
            @PathVariable("id") UUID id,
            @RequestBody ClientRequest body,
            @RequestHeader(value = "X-Jobocate-User-Id", required = false) UUID actor) {
        return ClientResponse.from(clients.update(id, body.toInput(), actor));
    }

    public record ClientRequest(
            String name,
            ClientStatus status,
            String channel,
            UUID ownerUserId,
            Instant lastContactAt,
            LocalDate msaEndsOn) {
        ClientInput toInput() {
            return new ClientInput(name, status, channel, ownerUserId, lastContactAt, msaEndsOn);
        }
    }

    public record ClientResponse(
            UUID id,
            String name,
            ClientStatus status,
            String channel,
            UUID ownerUserId,
            Instant lastContactAt,
            LocalDate msaEndsOn,
            long openJobs,
            Instant createdAt) {
        static ClientResponse from(ClientView v) {
            var c = v.client();
            return new ClientResponse(
                    c.getId(),
                    c.getName(),
                    c.getStatus(),
                    c.getChannel(),
                    c.getOwnerUserId(),
                    c.getLastContactAt(),
                    c.getMsaEndsOn(),
                    v.openJobs(),
                    c.getCreatedAt());
        }
    }
}
