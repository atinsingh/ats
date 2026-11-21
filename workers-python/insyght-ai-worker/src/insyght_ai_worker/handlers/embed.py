"""embed: `jobocate.embedding.request` → `jobocate.embedding.ready` (was embedding-worker)."""

from __future__ import annotations

import json

from insyght_ai_worker.config import Settings
from insyght_ai_worker.gateway import AiGateway
from insyght_ai_worker.runtime import Handler, Outgoing


def build(settings: Settings, gateway: AiGateway) -> Handler:
    out_topic = settings.embed_out_topic

    def handle(raw: str) -> list[Outgoing]:
        payload = json.loads(raw)
        tenant_id = payload.get("tenant_id")
        embedding = gateway.embed(tenant_id=tenant_id, text=str(payload.get("text", "")))
        out = {
            "type": "EMBEDDING_READY",
            "tenant_id": tenant_id,
            "target": payload.get("target"),
            "vector": embedding.vector,
            "model": embedding.model,
        }
        return [Outgoing(out_topic, out, key=str(tenant_id or ""))]

    return Handler(
        name="embed",
        in_topic=settings.embed_in_topic,
        group=settings.embed_group,
        handle=handle,
    )
