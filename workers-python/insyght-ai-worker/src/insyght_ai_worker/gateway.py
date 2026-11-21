"""The AI gateway seam. Handlers call this and never a model provider directly.

IATS-104 builds the real gateway (prompt registry, cost limits, redaction, evals and audit).
Until then `StubGateway` is the only implementation. It returns the same deterministic output
the old workers produced, so local and CI runs need no network or keys.
"""

from __future__ import annotations

import hashlib
import logging
import math
import os
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Protocol

from insyght_ai_worker.stub_renderer import render_artifact

log = logging.getLogger("insyght-ai-worker.gateway")

EMBEDDING_DIM = 128


@dataclass(frozen=True)
class GeneratedArtifact:
    """What we POST back to application-service /internal/v1/ai-artifacts/{id}/result."""

    output_text: str | None
    output_s3_key: str | None
    model_version: str
    prompt_version: str

    def to_payload(self, idempotency_key: str | None = None) -> dict[str, Any]:
        body: dict[str, Any] = {
            "model_version": self.model_version,
            "prompt_version": self.prompt_version,
        }
        if self.output_text is not None:
            body["outputText"] = self.output_text
        if self.output_s3_key is not None:
            body["outputS3Key"] = self.output_s3_key
        if idempotency_key is not None:
            body["idempotencyKey"] = idempotency_key
        return body


@dataclass(frozen=True)
class Embedding:
    vector: list[float]
    model: str


class AiGateway(Protocol):
    """Every model call a handler makes. `tenant_id` is required so cost and audit are per tenant."""

    def generate_artifact(
        self,
        *,
        tenant_id: str,
        kind: str,
        inputs: Mapping[str, Any],
        context: Mapping[str, Any],
    ) -> GeneratedArtifact: ...

    def embed(self, *, tenant_id: str | None, text: str) -> Embedding: ...


class StubGateway:
    """Deterministic, offline gateway for tests and local development."""

    model_id = "stub-2026-01"
    prompt_version = "v1"
    embedding_model = "pseudo-dev"

    def generate_artifact(
        self,
        *,
        tenant_id: str,
        kind: str,
        inputs: Mapping[str, Any],
        context: Mapping[str, Any],
    ) -> GeneratedArtifact:
        return GeneratedArtifact(
            output_text=render_artifact(kind, inputs, context),
            output_s3_key=None,
            model_version=self.model_id,
            prompt_version=self.prompt_version,
        )

    def embed(self, *, tenant_id: str | None, text: str) -> Embedding:
        return Embedding(vector=_pseudo_embedding(text), model=self.embedding_model)


def select_gateway(env: Mapping[str, str] | None = None) -> AiGateway:
    """Pick the gateway from `AI_GATEWAY` (or the old `AI_ARTIFACT_PROVIDER`). Only `stub` exists."""
    env = os.environ if env is None else env
    choice = (env.get("AI_GATEWAY") or env.get("AI_ARTIFACT_PROVIDER") or "stub").strip().lower()
    if choice != "stub":
        log.warning("gateway_unknown_falling_back_to_stub gateway=%s", choice)
    return StubGateway()


def _pseudo_embedding(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    """Deterministic unit vector derived from the text (moved from embedding-worker)."""
    seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:8], 16)
    rng = seed
    out: list[float] = []
    for _ in range(dim):
        rng = (1103515245 * rng + 12345) & 0x7FFFFFFF
        out.append((rng % 1000) / 1000.0 - 0.5)
    norm = math.sqrt(sum(x * x for x in out)) or 1.0
    return [x / norm for x in out]
