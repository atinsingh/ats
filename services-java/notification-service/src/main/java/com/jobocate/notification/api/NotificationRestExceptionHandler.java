package com.jobocate.notification.api;

import com.jobocate.notification.application.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class NotificationRestExceptionHandler {

    @ExceptionHandler(NotificationService.NotificationNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handle(
            NotificationService.NotificationNotFoundException ex, HttpServletRequest req) {
        return envelope(404, "NOTIFICATION_NOT_FOUND", ex.getMessage(), null, req);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handle(AccessDeniedException ex, HttpServletRequest req) {
        return envelope(403, "ACCESS_DENIED", ex.getMessage() == null ? "forbidden" : ex.getMessage(), null, req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handle(
            MethodArgumentNotValidException ex, HttpServletRequest req) {
        List<Map<String, String>> details = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> Map.of(
                        "field", fe.getField(),
                        "message", fe.getDefaultMessage() == null ? "" : fe.getDefaultMessage()))
                .toList();
        return envelope(400, "VALIDATION_FAILED", "Validation failed", details, req);
    }

    private static ResponseEntity<Map<String, Object>> envelope(
            int statusCode, String code, String message, Object details, HttpServletRequest req) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("code", code);
        error.put("message", message);
        if (details != null) error.put("details", details);

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
