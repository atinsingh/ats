CREATE TABLE job_skills (
    job_id        UUID         NOT NULL,
    skill_name    VARCHAR(128) NOT NULL,
    requirement   VARCHAR(16)  NOT NULL DEFAULT 'NICE_TO_HAVE',
    weight        SMALLINT     NOT NULL DEFAULT 1,
    PRIMARY KEY (job_id, skill_name),
    CONSTRAINT chk_job_skill_requirement
        CHECK (requirement IN ('REQUIRED','NICE_TO_HAVE'))
);

CREATE INDEX idx_job_skills_skill ON job_skills (skill_name);
