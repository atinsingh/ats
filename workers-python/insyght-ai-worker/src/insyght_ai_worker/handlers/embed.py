"""embed: `jobocate.embedding.request` → `jobocate.embedding.ready` (was embedding-worker)."""

from __future__ import annotations

import json
import logging

from insyght_ai_worker.config import Settings
from insyght_ai_worker.gateway import AiGateway
from insyght_ai_worker.runtime import Handler, Outgoing

log = logging.getLogger("insyght-ai-worker.embed")


def build(settings: Settings, gateway: AiGateway) -> Handler:
    out_topic = settings.embed_out_topic

    def handle(raw: str) -> list[Outgoing]:
        payload = json.loads(raw)
        tenant_id = payload.get("tenant_id")
        if not tenant_id:
            # Every event and model call is tenant-scoped (AGENTS.md); the old worker embedded these anyway.
            log.warning("embed_skipped_no_tenant target=%s", payload.get("target"))
            return []
        embedding = gateway.embed(tenant_id=tenant_id, text=str(payload.get("text", "")))
        out = {
            "type": "EMBEDDING_READY",
            "tenant_id": tenant_id,
            "target": payload.get("target"),
            "vector": embedding.vector,
            "model": embedding.model,
        }
        return [Outgoing(out_topic, out, key=tenant_id)]

    return Handler(
        name="embed",
        in_topic=settings.embed_in_topic,
        group=settings.embed_group,
        handle=handle,
    )
