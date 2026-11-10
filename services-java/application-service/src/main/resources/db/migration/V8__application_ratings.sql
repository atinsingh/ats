CREATE TABLE application_ratings (
    id                  UUID         PRIMARY KEY,
    application_id      UUID         NOT NULL,
    tenant_id           UUID         NOT NULL,
    rater_user_id       UUID         NOT NULL,
    score               SMALLINT     NOT NULL,
    rating_comment      TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version             BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_application_rating_score CHECK (score BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX ux_application_ratings_one_per_rater
    ON application_ratings (application_id, rater_user_id);

CREATE INDEX idx_application_ratings_app ON application_ratings (application_id);
