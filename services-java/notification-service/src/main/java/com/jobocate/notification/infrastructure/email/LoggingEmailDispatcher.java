package com.jobocate.notification.infrastructure.email;

import com.jobocate.notification.application.EmailDispatcher;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Default email dispatcher used in dev / CI / unit tests. Logs the message
 * and pretends delivery succeeded. Replace with an SMTP/SaaS-backed
 * implementation in {@code production} profile.
 */
@Configuration
public class LoggingEmailDispatcher {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailDispatcher.class);

    @Bean
    @ConditionalOnMissingBean(EmailDispatcher.class)
    public EmailDispatcher loggingEmailDispatcher() {
        return msg -> {
            String providerId = "log-" + UUID.randomUUID();
            log.info(
                    "[email/log] to={} subject=\"{}\" providerId={} correlationId={}",
                    msg.toEmail(),
                    msg.subject(),
                    providerId,
                    msg.correlationId());
            log.debug("[email/log] body=\n{}", msg.textBody());
            return EmailDispatcher.DispatchResult.ok(providerId);
        };
    }
}
