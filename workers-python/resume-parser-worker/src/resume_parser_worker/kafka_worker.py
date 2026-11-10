from __future__ import annotations

import json
import logging
import os
import signal
import sys
import uuid
from typing import Any

# `kafka-python` is only needed to actually run the worker. Tests import this
# module to call parse_resume_upload_event directly, so we keep the kafka
# imports lazy to avoid a hard dependency on the package at import time.

from resume_parser_worker.normalize import (
    extract_email,
    extract_headline_from_filename,
    extract_phone,
    extract_skills,
    extract_years_experience,
    guess_full_name,
    normalize_text,
)
from resume_parser_worker.storage import S3Settings, fetch_object_text

log = logging.getLogger("resume-parser-worker")

PARSER_VERSION = "0.2.0"


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default).strip()


def run() -> int:
    from kafka import KafkaConsumer, KafkaProducer  # lazy: only needed at runtime

    logging.basicConfig(
        level=_env("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        stream=sys.stdout,
    )

    brokers = _env("KAFKA_BOOTSTRAP_SERVERS", "localhost:19092")
    in_topic = _env("KAFKA_TOPIC_RESUME_RAW", "jobocate.resume.raw")
    out_topic = _env("KAFKA_TOPIC_RESUME_PARSED", "jobocate.resume.parsed")
    group = _env("KAFKA_GROUP_RESUME_PARSER", "jobocate-resume-parser")

    settings = S3Settings.from_env()

    consumer = KafkaConsumer(
        in_topic,
        bootstrap_servers=brokers,
        group_id=group,
        enable_auto_commit=False,
        auto_offset_reset="earliest",
        value_deserializer=lambda v: v.decode("utf-8"),
    )
    producer = KafkaProducer(
        bootstrap_servers=brokers,
        acks="all",
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )

    stop = False

    def _handle_sig(*_args: Any) -> None:
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, _handle_sig)
    signal.signal(signal.SIGTERM, _handle_sig)

    log.info("started in=%s out=%s group=%s", in_topic, out_topic, group)
    while not stop:
        records = consumer.poll(timeout_ms=1000)
        if not records:
            continue
        for tp, batch in records.items():
            for msg in batch:
                try:
                    payload = json.loads(msg.value)
                    parsed = parse_resume_upload_event(payload, settings=settings)
                    key = parsed.get("candidate_id") or parsed.get("resume_id")
                    producer.send(out_topic, key=key, value=parsed)
                except Exception:
                    log.exception("parse_failed offset=%s", getattr(msg, "offset", "?"))
                    failure_payload = _failure_payload(msg.value)
                    if failure_payload:
                        producer.send(out_topic, value=failure_payload)
            consumer.commit({tp: batch[-1].offset + 1})  # type: ignore[arg-type]
        producer.flush()

    consumer.close()
    producer.close()
    return 0


def parse_resume_upload_event(
    payload: dict[str, Any], *, settings: S3Settings | None = None
) -> dict[str, Any]:
    """Extract structured fields from a `resume.uploaded` event.

    The function is pure aside from the optional S3 fetch. Tests can pass
    S3Settings(enabled=False) to keep it deterministic.
    """
    s3_key = str(payload.get("s3_key", ""))
    mime_type = payload.get("mime_type")
    candidate_id = payload.get("candidate_id")
    tenant_id = payload.get("tenant_id")
    resume_id = payload.get("resume_id")
    settings = settings or S3Settings.from_env()

    raw_text = fetch_object_text(settings, s3_key, mime_type) if s3_key else ""
    if not raw_text:
        # Fall back to filename-based hints so the pipeline still produces *something*
        raw_text = extract_headline_from_filename(s3_key) or ""

    normalized = normalize_text(raw_text)

    return {
        "type": "RESUME_PARSED",
        "schema_version": "v1",
        "event_id": str(uuid.uuid4()),
        "resume_id": resume_id,
        "candidate_id": candidate_id,
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


def _failure_payload(raw_value: str) -> dict[str, Any] | None:
    """Best-effort minimal failure event so downstream can record the parse failure."""
    try:
        payload = json.loads(raw_value)
    except Exception:
        return None
    if not payload.get("resume_id"):
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
