"""generate_artifact: `ai.artifact.requested` events → application-service callback (was ai-artifact-worker).

The result is a draft artifact that a recruiter reviews. Nothing here rejects, advances or
contacts a candidate.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

import orjson

from insyght_ai_worker.config import Settings
from insyght_ai_worker.gateway import AiGateway, GeneratedArtifact
from insyght_ai_worker.runtime import Handler, Outgoing

log = logging.getLogger("insyght-ai-worker.generate_artifact")

# (path, tenant_id, json body) -> None. Raises on a non-2xx response.
PostFn = Callable[[str, str, dict[str, Any]], None]


def http_poster(base_url: str, token: str) -> PostFn:
    def post(path: str, tenant_id: str, body: dict[str, Any]) -> None:
        import httpx

        res = httpx.post(
            f"{base_url.rstrip('/')}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Jobocate-Tenant-Id": tenant_id,
                "Content-Type": "application/json",
            },
            content=orjson.dumps(body),
            timeout=30.0,
        )
        if res.status_code >= 400:
            raise RuntimeError(f"callback failed: {res.status_code} {res.text}")

    return post


def process_event(raw: str, gateway: AiGateway, post: PostFn) -> None:
    try:
        evt = orjson.loads(raw)
    except orjson.JSONDecodeError as ex:
        log.warning("event_unparseable err=%s", ex)
        return
    if evt.get("type") != "ai.artifact.requested":
        return
    artifact_id = evt.get("artifact_id")
    tenant_id = evt.get("tenant_id")
    kind = evt.get("kind", "")
    if not artifact_id or not tenant_id or not kind:
        log.warning("event_malformed artifact_id=%s kind=%s", artifact_id, kind)
        return

    context = {
        "subject_entity_type": evt.get("subject_entity_type"),
        "subject_entity_id": evt.get("subject_entity_id"),
        "related_application_id": evt.get("related_application_id"),
        "related_job_id": evt.get("related_job_id"),
    }
    try:
        result: GeneratedArtifact = gateway.generate_artifact(
            tenant_id=tenant_id, kind=kind, inputs=evt.get("inputs") or {}, context=context
        )
        post(
            f"/internal/v1/ai-artifacts/{artifact_id}/result",
            tenant_id,
            result.to_payload(idempotency_key=evt.get("event_id")),
        )
        log.info("artifact_dispatched id=%s kind=%s", artifact_id, kind)
    except Exception as ex:
        log.exception("artifact_failed id=%s kind=%s", artifact_id, kind)
        try:
            post(f"/internal/v1/ai-artifacts/{artifact_id}/failure", tenant_id, {"reason": str(ex)[:1000]})
        except Exception:
            log.exception("artifact_failure_callback_failed id=%s", artifact_id)


def build(settings: Settings, gateway: AiGateway, post: PostFn | None = None) -> Handler:
    post = post or http_poster(settings.application_service_url, settings.internal_token)

    def handle(raw: str) -> list[Outgoing]:
        process_event(raw, gateway, post)
        return []

    return Handler(
        name="generate_artifact",
        in_topic=settings.artifact_in_topic,
        group=settings.artifact_group,
        handle=handle,
    )
