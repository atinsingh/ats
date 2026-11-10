package com.jobocate.application.infrastructure.persistence;

/**
 * Entity an AI artifact is "about". Used together with
 * {@link AiArtifactEntity#getSubjectEntityId()} to scope reads/writes and to
 * authorise candidate vs recruiter access.
 */
public enum AiArtifactSubjectType {
    /** Candidate's own profile (candidate-owned, candidate must approve). */
    CANDIDATE_PROFILE,
    /** A specific job application (candidate-owned). */
    APPLICATION,
    /** A job post (recruiter-owned). */
    JOB,
    /** A specific resume version (candidate-owned). */
    RESUME,
    /** An interview slot (recruiter / interviewer-owned). */
    INTERVIEW
}
