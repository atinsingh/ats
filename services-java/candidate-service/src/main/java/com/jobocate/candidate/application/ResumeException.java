package com.jobocate.candidate.application;

import org.springframework.http.HttpStatus;

/** Domain-shaped exception thrown by {@link ResumeService}. */
public class ResumeException extends RuntimeException {

    public enum Kind {
        NOT_FOUND(HttpStatus.NOT_FOUND, "resume_not_found"),
        UNSUPPORTED_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported_resume_type"),
        FILE_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "resume_too_large"),
        VALIDATION_FAILED(HttpStatus.UNPROCESSABLE_ENTITY, "resume_validation_failed"),
        ALREADY_REVIEWED(HttpStatus.CONFLICT, "resume_already_reviewed"),
        STORAGE_FAILURE(HttpStatus.BAD_GATEWAY, "resume_storage_failed");

        private final HttpStatus http;
        private final String code;

        Kind(HttpStatus http, String code) {
            this.http = http;
            this.code = code;
        }

        public HttpStatus http() {
            return http;
        }

        public String code() {
            return code;
        }
    }

    private final Kind kind;

    public ResumeException(Kind kind, String message) {
        super(message);
        this.kind = kind;
    }

    public Kind getKind() {
        return kind;
    }
}
