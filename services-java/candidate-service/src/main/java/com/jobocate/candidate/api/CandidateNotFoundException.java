package com.jobocate.candidate.api;

import java.util.UUID;

/** No candidate with this id in the caller's tenant. Never says whether another tenant has one. */
public class CandidateNotFoundException extends RuntimeException {

    public CandidateNotFoundException(UUID id) {
        super("Candidate " + id + " not found");
    }
}
