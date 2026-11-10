package com.jobocate.application.infrastructure.persistence;

/**
 * Categories of AI-generated artifacts the platform supports. Mirrors the
 * {@code chk_ai_artifact_kind} CHECK constraint in {@code V9__ai_artifacts.sql}
 * and the {@code AiArtifactKind} enum exposed in the OpenAPI spec.
 */
public enum AiArtifactKind {
    /** Candidate-facing tailored resume output. */
    RESUME_VARIANT,
    /** Candidate-facing cover letter draft. */
    COVER_LETTER,
    /** Recruiter-facing condensed summary of a candidate. */
    CANDIDATE_SUMMARY,
    /** Explanation of why a candidate matches a given job. */
    MATCH_EXPLANATION,
    /** Interview prep Q&A pack for the candidate. */
    INTERVIEW_QA,
    /** Recruiter-facing rejection email draft. */
    REJECTION_EMAIL,
    /** Recruiter-facing screening question suggestions for a job. */
    SCREENING_QUESTIONS,
    /** Recruiter-facing shortlist recommendation for a job. */
    SHORTLIST_RECOMMENDATION
}
