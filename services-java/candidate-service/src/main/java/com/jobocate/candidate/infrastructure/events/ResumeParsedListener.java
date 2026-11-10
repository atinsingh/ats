package com.jobocate.candidate.infrastructure.events;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobocate.candidate.application.ResumeService;
import com.jobocate.candidate.infrastructure.persistence.ResumeParsedFieldsEntity;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Consumes {@code jobocate.resume.parsed} and writes the parser output back
 * to {@code resume_parsed_fields} via {@link ResumeService}. Idempotent on
 * the parser-supplied {@code event_id}.
 */
@Component
@ConditionalOnProperty(prefix = "jobocate.kafka", name = "resume-parsed-consumer-enabled", havingValue = "true", matchIfMissing = true)
public class ResumeParsedListener {

    private static final Logger log = LoggerFactory.getLogger(ResumeParsedListener.class);

    private final ResumeService service;
    private final ObjectMapper json;
    private final Counter accepted;
    private final Counter dropped;
    private final Counter failed;

    public ResumeParsedListener(ResumeService service, ObjectMapper json, MeterRegistry meters) {
        this.service = service;
        this.json = json;
        this.accepted = Counter.builder("candidate.resume.parsed.accepted").register(meters);
        this.dropped = Counter.builder("candidate.resume.parsed.dropped").register(meters);
        this.failed = Counter.builder("candidate.resume.parsed.failed").register(meters);
    }

    @KafkaListener(
            topics = "${jobocate.kafka.resume-parsed-topic:jobocate.resume.parsed}",
            groupId = "${jobocate.kafka.resume-parsed-group:jobocate-candidate-resume-projector}")
    public void onMessage(String body) {
        try {
            JsonNode root = json.readTree(body);
            UUID resumeId = uuid(root, "resume_id");
            UUID eventId = uuid(root, "event_id");
            if (resumeId == null) {
                dropped.increment();
                log.warn("resume.parsed missing resume_id");
                return;
            }
            boolean isFailure = root.path("failed").asBoolean(false);
            if (isFailure) {
                service.recordParsedFields(eventId, resumeId, new ResumeParsedFieldsEntity(), true, root.path("error").asText("parser failure"));
                failed.increment();
                return;
            }
            ResumeParsedFieldsEntity proposed = new ResumeParsedFieldsEntity();
            proposed.setFullName(text(root, "full_name"));
            proposed.setEmail(text(root, "email"));
            proposed.setPhone(text(root, "phone"));
            proposed.setLocationCity(text(root, "location_city"));
            proposed.setLocationRegion(text(root, "location_region"));
            proposed.setLocationCountry(text(root, "location_country"));
            proposed.setSkills(stringList(root, "skills"));
            JsonNode years = root.path("total_experience_years");
            if (years.isNumber()) {
                proposed.setTotalExperienceYears(BigDecimal.valueOf(years.doubleValue()));
            }
            proposed.setParsedText(text(root, "parsed_text"));
            JsonNode structured = root.path("structured");
            proposed.setStructured(structured.isObject() ? toMap(structured) : new HashMap<>());
            proposed.setParserVersion(text(root, "parser_version"));
            service.recordParsedFields(eventId, resumeId, proposed, false, null);
            accepted.increment();
        } catch (Exception ex) {
            failed.increment();
            log.warn("resume.parsed processing failed: {}", ex.getMessage());
        }
    }

    private static UUID uuid(JsonNode root, String field) {
        JsonNode v = root.path(field);
        if (v.isMissingNode() || v.isNull() || v.asText().isBlank()) return null;
        try {
            return UUID.fromString(v.asText());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static String text(JsonNode root, String field) {
        JsonNode v = root.path(field);
        if (v.isMissingNode() || v.isNull()) return null;
        String s = v.asText();
        return s.isBlank() ? null : s;
    }

    private static List<String> stringList(JsonNode root, String field) {
        JsonNode v = root.path(field);
        if (!v.isArray()) return List.of();
        List<String> out = new ArrayList<>(v.size());
        v.forEach(n -> {
            if (n.isTextual() && !n.asText().isBlank()) out.add(n.asText());
        });
        return out;
    }

    private static Map<String, Object> toMap(JsonNode node) {
        Map<String, Object> out = new HashMap<>();
        node.fields().forEachRemaining(e -> {
            JsonNode v = e.getValue();
            if (v.isTextual()) out.put(e.getKey(), v.asText());
            else if (v.isNumber()) out.put(e.getKey(), v.numberValue());
            else if (v.isBoolean()) out.put(e.getKey(), v.asBoolean());
            else out.put(e.getKey(), v.toString());
        });
        return out;
    }
}
