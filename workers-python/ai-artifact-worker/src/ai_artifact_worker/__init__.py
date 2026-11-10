"""Worker that turns `ai.artifact.requested` Kafka events into model outputs.

The worker is intentionally thin: it pulls one event at a time, fans the
artifact's prompt+inputs through a pluggable {@code AiProvider}, and POSTs
the result back to {@code application-service} via its `/internal/v1`
endpoint. Provider selection (OpenAI, Anthropic, local stub, etc.) is left
to the deployment via {@code AI_ARTIFACT_PROVIDER}.
"""

from .renderer import (
    AiProvider,
    GeneratedArtifact,
    StubProvider,
    render_artifact,
)

__all__ = ["AiProvider", "GeneratedArtifact", "StubProvider", "render_artifact"]
