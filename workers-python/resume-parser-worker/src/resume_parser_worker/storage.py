"""S3 fetch helper for the resume-parser-worker.

`boto3` is an optional dependency: if it isn't installed (or `JOBOCATE_S3_ENABLED=false`),
the worker falls back to using the s3_key string as the parsed text so the rest of
the pipeline still flows end-to-end in CI / local-dev without MinIO running.
"""
from __future__ import annotations

import io
import logging
import os
from dataclasses import dataclass

log = logging.getLogger("resume-parser-worker.storage")


@dataclass(frozen=True)
class S3Settings:
    enabled: bool
    endpoint: str | None
    region: str
    access_key: str
    secret_key: str
    bucket: str

    @classmethod
    def from_env(cls) -> "S3Settings":
        enabled = os.environ.get("JOBOCATE_S3_ENABLED", "true").lower() not in ("0", "false", "no")
        return cls(
            enabled=enabled,
            endpoint=os.environ.get("S3_ENDPOINT") or None,
            region=os.environ.get("S3_REGION", "us-east-1"),
            access_key=os.environ.get("S3_ACCESS_KEY", ""),
            secret_key=os.environ.get("S3_SECRET_KEY", ""),
            bucket=os.environ.get("S3_BUCKET_RESUMES", "jobocate-resumes"),
        )


def fetch_object_text(settings: S3Settings, object_key: str, mime_type: str | None) -> str:
    """Best-effort: download object and return decoded text. Empty string on failure."""
    if not settings.enabled:
        return ""
    try:
        import boto3  # type: ignore[import-not-found]
    except ImportError:
        log.info("boto3 not installed; skipping S3 fetch for %s", object_key)
        return ""
    try:
        s3 = boto3.client(
            "s3",
            endpoint_url=settings.endpoint,
            aws_access_key_id=settings.access_key,
            aws_secret_access_key=settings.secret_key,
            region_name=settings.region,
        )
        buf = io.BytesIO()
        s3.download_fileobj(settings.bucket, object_key, buf)
        return _decode_bytes(buf.getvalue(), mime_type or "")
    except Exception as e:
        log.warning("s3 download failed key=%s err=%s", object_key, e)
        return ""


def _decode_bytes(data: bytes, mime_type: str) -> str:
    if not data:
        return ""
    # PDF: try pypdf if available; otherwise return whatever decodes as text.
    if mime_type == "application/pdf":
        try:
            from pypdf import PdfReader  # type: ignore[import-not-found]

            reader = PdfReader(io.BytesIO(data))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            log.info("pdf parse fallback to raw text: %s", e)
    if mime_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ):
        try:
            from docx import Document  # type: ignore[import-not-found]

            doc = Document(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception as e:
            log.info("docx parse fallback to raw text: %s", e)
    try:
        return data.decode("utf-8", errors="ignore")
    except Exception:
        return ""
