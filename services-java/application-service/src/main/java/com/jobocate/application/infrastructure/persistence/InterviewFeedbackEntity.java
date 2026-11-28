package com.jobocate.application.infrastructure.persistence;

import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** One interviewer scorecard for an interview. */
@Entity
@Access(AccessType.FIELD)
@Table(name = "interview_feedback")
public class InterviewFeedbackEntity {

    @Id
    private UUID id;

    @NotNull
    @Column(name = "interview_id", nullable = false)
    private UUID interviewId;

    @NotNull
    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @NotNull
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @NotNull
    @Column(name = "interviewer_user_id", nullable = false)
    private UUID interviewerUserId;

    @Min(1)
    @Max(5)
    @Column(name = "overall_score")
    private Short overallScore;

    @Enumerated(EnumType.STRING)
    @Column private Recommendation recommendation;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String structured = "{}";

    @Column private String summary;

    @NotNull
    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt = Instant.now();

    public enum Recommendation {
        STRONG_HIRE,
        HIRE,
        NO_HIRE,
        STRONG_NO_HIRE
    }

    public InterviewFeedbackEntity() {}

    public InterviewFeedbackEntity(
            UUID id,
            UUID interviewId,
            UUID applicationId,
            UUID tenantId,
            UUID interviewerUserId,
            Short overallScore,
            Recommendation recommendation,
            String structured,
            String summary) {
        this.id = id;
        this.interviewId = interviewId;
        this.applicationId = applicationId;
        this.tenantId = tenantId;
        this.interviewerUserId = interviewerUserId;
        this.overallScore = overallScore;
        this.recommendation = recommendation;
        this.structured = structured == null ? "{}" : structured;
        this.summary = summary;
    }

    public UUID getId() {
        return id;
    }

    public UUID getInterviewId() {
        return interviewId;
    }

    public UUID getApplicationId() {
        return applicationId;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public UUID getInterviewerUserId() {
        return interviewerUserId;
    }

    public Short getOverallScore() {
        return overallScore;
    }

    public Recommendation getRecommendation() {
        return recommendation;
    }

    public String getStructured() {
        return structured;
    }

    public String getSummary() {
        return summary;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }
}
