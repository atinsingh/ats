package com.jobocate.platform.json;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;

/**
 * Spring Boot 4 auto-configures Jackson 3 ({@code tools.jackson}) only. The outbox publishers and
 * Kafka listeners inject Jackson 2's {@link ObjectMapper}, so without this bean those services
 * fail to start. ISO-8601 dates, as event consumers expect.
 */
@AutoConfiguration
@ConditionalOnClass(ObjectMapper.class)
public class JacksonCompatAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean(ObjectMapper.class)
    public ObjectMapper jobocateObjectMapper() {
        return JsonMapper.builder()
                .addModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .build();
    }
}
