package com.jobocate.notification.application;

/** Abstraction over the underlying mail provider (SMTP, SES, SendGrid, …). */
public interface EmailDispatcher {

    DispatchResult send(EmailMessage message);

    record EmailMessage(
            String toEmail,
            String toName,
            String subject,
            String htmlBody,
            String textBody,
            String correlationId) {}

    record DispatchResult(boolean success, String providerMessageId, String failureReason) {

        public static DispatchResult ok(String providerMessageId) {
            return new DispatchResult(true, providerMessageId, null);
        }

        public static DispatchResult fail(String reason) {
            return new DispatchResult(false, null, reason);
        }
    }
}
