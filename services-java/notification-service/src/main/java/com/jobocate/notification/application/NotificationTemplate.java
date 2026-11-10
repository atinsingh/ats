package com.jobocate.notification.application;

import com.jobocate.notification.infrastructure.persistence.NotificationType;
import java.util.Map;

/** Tiny templating registry — replace with Mustache / FTL / a CMS later. */
public final class NotificationTemplate {

    private NotificationTemplate() {}

    public record Rendered(String subject, String htmlBody, String textBody) {}

    public static Rendered render(NotificationType type, Map<String, Object> ctx) {
        return switch (type) {
            case APPLICATION_SUBMITTED -> new Rendered(
                    "Application received: " + str(ctx, "job_title", "your role"),
                    htmlGreeting(ctx, "Thanks for applying to " + str(ctx, "job_title", "your role")
                            + ". You'll get an update as soon as the recruiter takes a look."),
                    "Hi " + str(ctx, "candidate_name", "there") + "\n\n"
                            + "Thanks for applying to " + str(ctx, "job_title", "your role")
                            + ". You'll get an update as soon as the recruiter takes a look.\n\n"
                            + "— Jobocate");
            case APPLICATION_RECEIVED -> new Rendered(
                    "New applicant: " + str(ctx, "candidate_name", "candidate") + " for "
                            + str(ctx, "job_title", "your role"),
                    htmlGreeting(ctx,
                            str(ctx, "candidate_name", "Someone") + " just applied to "
                                    + str(ctx, "job_title", "your role")
                                    + ". Open the ATS to review."),
                    "A new applicant arrived for " + str(ctx, "job_title", "your role")
                            + ". Open the ATS to review.");
            case APPLICATION_STATUS_CHANGED -> new Rendered(
                    "Application update: " + str(ctx, "job_title", "your role"),
                    htmlGreeting(ctx, "Your application for " + str(ctx, "job_title", "your role")
                            + " moved to " + str(ctx, "to_status", "a new stage") + "."),
                    "Hi " + str(ctx, "candidate_name", "there") + "\n\n"
                            + "Your application status changed to "
                            + str(ctx, "to_status", "a new stage") + ".\n\n— Jobocate");
            case INTERVIEW_SCHEDULED -> new Rendered(
                    "Interview confirmed: " + str(ctx, "job_title", "your role"),
                    htmlGreeting(ctx, "Interview scheduled for " + str(ctx, "scheduled_at", "soon")
                            + ". Details inside."),
                    "Interview scheduled for " + str(ctx, "scheduled_at", "soon")
                            + ". Open Jobocate for the meeting link.");
            case INTERVIEW_REMINDER -> new Rendered(
                    "Reminder: interview at " + str(ctx, "scheduled_at", "soon"),
                    htmlGreeting(ctx, "Just a quick reminder of your upcoming interview."),
                    "Reminder: interview at " + str(ctx, "scheduled_at", "soon") + ".");
            case JOB_ALERT -> new Rendered(
                    "New jobs that match your search",
                    htmlGreeting(ctx, "We found " + str(ctx, "match_count", "a few")
                            + " new jobs that match your saved search."),
                    "New jobs match your saved search.");
            case AI_DRAFT_READY -> new Rendered(
                    "AI draft is ready",
                    htmlGreeting(ctx, "Your AI-generated " + str(ctx, "kind", "artifact")
                            + " is ready to review."),
                    "Your AI draft is ready to review.");
            case OFFER_SENT -> new Rendered(
                    "Offer sent: " + str(ctx, "job_title", "your role"),
                    htmlGreeting(ctx, "An offer has been sent for " + str(ctx, "job_title", "your role")
                            + "."),
                    "An offer has been sent for " + str(ctx, "job_title", "your role") + ".");
            case OFFER_ACCEPTED_CONFIRMATION -> new Rendered(
                    "Offer accepted",
                    htmlGreeting(ctx, "Congrats — the offer has been accepted."),
                    "The offer was accepted.");
            case CANDIDATE_HIRED -> new Rendered(
                    "Candidate hired: " + str(ctx, "candidate_name", "candidate"),
                    htmlGreeting(ctx, str(ctx, "candidate_name", "The candidate") + " has been hired."),
                    str(ctx, "candidate_name", "The candidate") + " has been hired.");
            case CANDIDATE_WITHDREW -> new Rendered(
                    "Application withdrawn",
                    htmlGreeting(ctx, str(ctx, "candidate_name", "The candidate")
                            + " withdrew their application for " + str(ctx, "job_title", "your role")
                            + "."),
                    str(ctx, "candidate_name", "Candidate") + " withdrew.");
            case INTERVIEW_RESCHEDULED -> new Rendered(
                    "Interview rescheduled",
                    htmlGreeting(ctx, "Interview moved to " + str(ctx, "scheduled_at", "soon") + "."),
                    "Interview moved to " + str(ctx, "scheduled_at", "soon") + ".");
            case INTERVIEW_FEEDBACK_COMPLETE -> new Rendered(
                    "Interview feedback ready",
                    htmlGreeting(ctx, "Feedback is in for the interview."),
                    "Interview feedback is ready in Jobocate.");
            case MENTION -> new Rendered(
                    str(ctx, "actor_name", "A teammate") + " mentioned you",
                    htmlGreeting(ctx, str(ctx, "actor_name", "A teammate") + " mentioned you on "
                            + str(ctx, "context_label", "an item") + "."),
                    str(ctx, "actor_name", "A teammate") + " mentioned you.");
            case SAVED_SEARCH_DIGEST -> new Rendered(
                    "Your saved-search digest",
                    htmlGreeting(ctx, "Here's what's new in your saved searches."),
                    "Saved-search digest is ready in Jobocate.");
        };
    }

    private static String str(Map<String, Object> ctx, String key, String fallback) {
        Object v = ctx == null ? null : ctx.get(key);
        return v == null || v.toString().isBlank() ? fallback : v.toString();
    }

    private static String htmlGreeting(Map<String, Object> ctx, String body) {
        return "<p>Hi " + str(ctx, "candidate_name", "there") + ",</p><p>"
                + body + "</p><p>— Jobocate</p>";
    }
}
