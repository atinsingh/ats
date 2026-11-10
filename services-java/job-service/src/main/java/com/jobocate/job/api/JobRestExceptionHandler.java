package com.jobocate.job.api;

import com.jobocate.job.domain.JobErrorCodes;
import com.jobocate.job.domain.JobException;
import com.jobocate.platform.tenant.MissingTenantException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class JobRestExceptionHandler {

    @ExceptionHandler(JobException.class)
    public ResponseEntity<Map<String, Object>> handle(JobException ex, HttpServletRequest req) {
        return envelope(ex.status().value(), ex.code(), ex.getMessage(), null, req);
    }

    @ExceptionHandler(MissingTenantException.class)
    public ResponseEntity<Map<String, Object>> handle(
            MissingTenantException ex, HttpServletRequest req) {
        return envelope(401, "AUTH_TENANT_MISSING", ex.getMessage(), null, req);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<Map<String, Object>> handle(
            OptimisticLockingFailureException ex, HttpServletRequest req) {
        return envelope(
                409,
                JobErrorCodes.OPTIMISTIC_LOCK_CONFLICT,
                "Resource was modified concurrently — refresh and retry",
                null,
                req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handle(
            MethodArgumentNotValidException ex, HttpServletRequest req) {
        List<Map<String, String>> details =
                ex.getBindingResult().getFieldErrors().stream()
                        .map(
                                fe ->
                                        Map.of(
                                                "field", fe.getField(),
                                                "message",
                                                        fe.getDefaultMessage() == null
                                                                ? ""
                                                                : fe.getDefaultMessage()))
                        .toList();
        return envelope(400, JobErrorCodes.VALIDATION_FAILED, "Validation failed", details, req);
    }

    private static ResponseEntity<Map<String, Object>> envelope(
            int statusCode, String code, String message, Object details, HttpServletRequest req) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("code", code);
        error.put("message", message);
        if (details != null) {
            error.put("details", details);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", error);
        body.put(
                "request_id",
                MDC.get("requestId") != null ? MDC.get("requestId") : UUID.randomUUID().toString());
        if (MDC.get("correlationId") != null) {
            body.put("correlation_id", MDC.get("correlationId"));
        }
        body.put("path", req.getRequestURI());
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.status(statusCode).body(body);
    }
}
