-- IATS-146: ApplicationNoteEntity extends AuditableEntity, which maps created_by_user_id, but
-- V6 never created that column, so `ddl-auto: validate` failed on a Flyway-built database.
ALTER TABLE application_notes ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
