"""parse_resume: `jobocate.resume.raw` → `jobocate.resume.parsed` (was resume-parser-worker).

Regex and heuristics only; no model call yet. When a model-based parser arrives it goes through
`AiGateway` like the other handlers.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from insyght_ai_worker.config import Settings
from insyght_ai_worker.resume.normalize import (
    extract_email,
    extract_headline_from_filename,
    extract_phone,
    extract_skills,
    extract_years_experience,
    guess_full_name,
    normalize_text,
)
from insyght_ai_worker.resume.storage import S3Settings, fetch_object_text
from insyght_ai_worker.runtime import Handler, Outgoing

PARSER_VERSION = "0.2.0"

log = logging.getLogger("insyght-ai-worker.parse_resume")


class TenantMismatchError(ValueError):
    """The resume object key is outside the event tenant's storage prefix."""


def parse_resume_upload_event(
    payload: dict[str, Any], *, settings: S3Settings | None = None
) -> dict[str, Any]:
    """Extract structured fields from a `resume.uploaded` event.

    Pure apart from the optional S3 fetch. Tests pass S3Settings(enabled=False).
    """
    s3_key = str(payload.get("s3_key", ""))
    mime_type = payload.get("mime_type")
    tenant_id = payload.get("tenant_id")
    settings = settings or S3Settings.from_env()

    # candidate-service stores resumes under tenants/{tenant_id}/... Never read another tenant's object.
    if s3_key and not s3_key.startswith(f"tenants/{tenant_id}/"):
        raise TenantMismatchError(f"s3_key is outside tenants/{tenant_id}/")

    raw_text = fetch_object_text(settings, s3_key, mime_type) if s3_key else ""
    if not raw_text:
        # Fall back to filename hints so the pipeline still produces something.
        raw_text = extract_headline_from_filename(s3_key) or ""

    normalized = normalize_text(raw_text)

    return {
        "type": "RESUME_PARSED",
        "schema_version": "v1",
        "event_id": str(uuid.uuid4()),
        "resume_id": payload.get("resume_id"),
        "candidate_id": payload.get("candidate_id"),
        "tenant_id": tenant_id,
        "s3_key": s3_key,
        "full_name": guess_full_name(raw_text),
        "email": extract_email(raw_text),
        "phone": extract_phone(raw_text),
        "skills": extract_skills(raw_text),
        "total_experience_years": extract_years_experience(raw_text),
        "parsed_text": normalized[:50_000] if normalized else None,
        "structured": {
            "headline_guess": extract_headline_from_filename(s3_key),
        },
        "parser_version": PARSER_VERSION,
        "failed": False,
    }


def failure_payload(raw_value: str) -> dict[str, Any] | None:
    """Minimal failure event so candidate-service can record that parsing failed."""
    try:
        payload = json.loads(raw_value)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(payload, dict) or not payload.get("resume_id"):
        return None
    return {
        "type": "RESUME_PARSED",
        "schema_version": "v1",
        "event_id": str(uuid.uuid4()),
        "resume_id": payload.get("resume_id"),
        "candidate_id": payload.get("candidate_id"),
        "tenant_id": payload.get("tenant_id"),
        "failed": True,
        "error": "parser exception",
        "parser_version": PARSER_VERSION,
    }


def build(settings: Settings, s3: S3Settings | None = None) -> Handler:
    s3 = s3 or S3Settings.from_env()
    out_topic = settings.resume_out_topic

    def handle(raw: str) -> list[Outgoing]:
        payload = json.loads(raw)
        if not payload.get("tenant_id"):
            log.warning("parse_skipped_no_tenant resume_id=%s", payload.get("resume_id"))
            return []
        parsed = parse_resume_upload_event(payload, settings=s3)
        return [Outgoing(out_topic, parsed, key=parsed.get("candidate_id") or parsed.get("resume_id"))]

    def on_error(raw: str) -> list[Outgoing]:
        failed = failure_payload(raw)
        return [Outgoing(out_topic, failed)] if failed else []

    return Handler(
        name="parse_resume",
        in_topic=settings.resume_in_topic,
        group=settings.resume_group,
        handle=handle,
        on_error=on_error,
        manual_commit=True,
    )
