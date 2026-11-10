package com.jobocate.auth.api;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Local-only demo token issuer. Replace with OAuth2/OIDC Authorization Server integration for production.
 */
@RestController
@RequestMapping("/api/auth")
public class DemoTokenController {

    private final SecretKey key;

    public DemoTokenController(@Value("${jobocate.security.jwt-secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(pad(secret.getBytes(StandardCharsets.UTF_8)));
    }

    @PostMapping("/demo-token")
    public Map<String, String> issue(@RequestBody DemoTokenRequest request) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(3600);
        String jwt = Jwts.builder()
                .subject(request.subject())
                .issuer("jobocate-tenant-auth")
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .claim("tenant_id", request.tenantId().toString())
                .signWith(key)
                .compact();
        return Map.of("access_token", jwt, "token_type", "Bearer", "expires_in", "3600");
    }

    private static byte[] pad(byte[] secret) {
        if (secret.length >= 32) {
            return secret;
        }
        byte[] padded = new byte[32];
        System.arraycopy(secret, 0, padded, 0, Math.min(secret.length, 32));
        for (int i = secret.length; i < 32; i++) {
            padded[i] = (byte) i;
        }
        return padded;
    }

    public record DemoTokenRequest(
            @NotNull UUID tenantId, @NotBlank String subject, String audience) {}
}
