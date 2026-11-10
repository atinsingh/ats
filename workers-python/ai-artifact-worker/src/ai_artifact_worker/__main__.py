"""Kafka consumer entrypoint.

Run with `python -m ai_artifact_worker`. All wire dependencies (Kafka,
HTTPX) are imported lazily so unit tests of the rendering layer don't need
brokers or running services.
"""

from __future__ import annotations

import logging
import os
import signal
import sys
from typing import Any

import orjson

from .renderer import AiProvider, GeneratedArtifact, StubProvider

log = logging.getLogger("ai-artifact-worker")


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default).strip()


def _select_provider() -> AiProvider:
    provider_id = _env("AI_ARTIFACT_PROVIDER", "stub").lower()
    # Real providers live behind extras to keep the base image lean. We
    # deliberately fall back to the stub if the import fails so dev environments
    # without keys still publish back to application-service.
    if provider_id == "stub":
        return StubProvider()
    log.warning("provider_unknown_falling_back_to_stub provider=%s", provider_id)
    return StubProvider()


def _post_back(
    base_url: str, token: str, tenant_id: str, artifact_id: str, payload: dict[str, Any]
) -> None:
    import httpx

    url = f"{base_url.rstrip('/')}/internal/v1/ai-artifacts/{artifact_id}/result"
    res = httpx.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "X-Jobocate-Tenant-Id": tenant_id,
            "Content-Type": "application/json",
        },
        content=orjson.dumps(payload),
        timeout=30.0,
    )
    if res.status_code >= 400:
        raise RuntimeError(f"callback failed: {res.status_code} {res.text}")


def _post_failure(
    base_url: str, token: str, tenant_id: str, artifact_id: str, reason: str
) -> None:
    import httpx

    url = f"{base_url.rstrip('/')}/internal/v1/ai-artifacts/{artifact_id}/failure"
    httpx.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "X-Jobocate-Tenant-Id": tenant_id,
            "Content-Type": "application/json",
        },
        content=orjson.dumps({"reason": reason[:1000]}),
        timeout=30.0,
    )


def run() -> int:
    logging.basicConfig(
        level=_env("LOG_LEVEL", "INFO"), format="%(message)s", stream=sys.stdout
    )

    from kafka import KafkaConsumer

    brokers = _env("KAFKA_BOOTSTRAP_SERVERS", "localhost:19092")
    in_topic = _env("KAFKA_TOPIC_AI_ARTIFACT_EVENTS", "jobocate.ai.artifact.events")
    group = _env("KAFKA_GROUP_AI_ARTIFACT_WORKER", "jobocate-ai-artifact-worker")

    backend_base = _env(
        "APPLICATION_SERVICE_INTERNAL_URL", "http://localhost:8084"
    )
    internal_token = _env("JOBOCATE_INTERNAL_TOKEN", "jobocate-internal-dev-token")

    provider = _select_provider()

    consumer = KafkaConsumer(
        in_topic,
        bootstrap_servers=brokers,
        group_id=group,
        enable_auto_commit=True,
        auto_offset_reset="earliest",
        value_deserializer=lambda v: v.decode("utf-8"),
    )

    stop = False

    def _handle_sig(*_args: Any) -> None:
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, _handle_sig)
    signal.signal(signal.SIGTERM, _handle_sig)

    log.info(
        "started topic=%s group=%s provider=%s backend=%s",
        in_topic,
        group,
        provider.__class__.__name__,
        backend_base,
    )

    while not stop:
        records = consumer.poll(timeout_ms=1000)
        for _tp, batch in records.items():
            for msg in batch:
                _process_event(msg.value, provider, backend_base, internal_token)

    consumer.close()
    return 0


def _process_event(
    raw: str, provider: AiProvider, backend_base: str, internal_token: str
) -> None:
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
        log.warning("event_malformed evt=%s", evt)
        return

    inputs = evt.get("inputs") or {}
    context = {
        "subject_entity_type": evt.get("subject_entity_type"),
        "subject_entity_id": evt.get("subject_entity_id"),
        "related_application_id": evt.get("related_application_id"),
        "related_job_id": evt.get("related_job_id"),
    }
    try:
        result: GeneratedArtifact = provider.generate(
            kind=kind, inputs=inputs, context=context
        )
        _post_back(
            backend_base,
            internal_token,
            tenant_id,
            artifact_id,
            result.to_payload(idempotency_key=evt.get("event_id")),
        )
        log.info("artifact_dispatched id=%s kind=%s", artifact_id, kind)
    except Exception as ex:  # noqa: BLE001 - intentional broad catch
        log.exception("artifact_failed id=%s kind=%s", artifact_id, kind)
        try:
            _post_failure(
                backend_base, internal_token, tenant_id, artifact_id, str(ex)
            )
        except Exception:  # noqa: BLE001
            log.exception("artifact_failure_callback_failed id=%s", artifact_id)


if __name__ == "__main__":
    raise SystemExit(run())
