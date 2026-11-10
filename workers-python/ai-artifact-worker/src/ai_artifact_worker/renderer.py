"""Pure-python rendering layer for the AI artifact worker.

`AiProvider` is the integration seam — production deployments inject an
OpenAI / Anthropic / Vertex client, while CI and local development use
`StubProvider` to keep tests deterministic and free of network calls.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol


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


class AiProvider(Protocol):
    """Contract every provider plug-in must implement."""

    model_id: str
    prompt_version: str

    def generate(
        self, *, kind: str, inputs: Mapping[str, Any], context: Mapping[str, Any]
    ) -> GeneratedArtifact: ...


class StubProvider:
    """Deterministic, offline provider used by tests + local dev.

    Output shape mirrors the canonical contract for each `AiArtifactKind` so
    UIs can be wired against realistic skeletons before any LLM keys are
    added to the deployment.
    """

    model_id = "stub-2026-01"
    prompt_version = "v1"

    def generate(
        self, *, kind: str, inputs: Mapping[str, Any], context: Mapping[str, Any]
    ) -> GeneratedArtifact:
        text = render_artifact(kind, inputs, context)
        return GeneratedArtifact(
            output_text=text,
            output_s3_key=None,
            model_version=self.model_id,
            prompt_version=self.prompt_version,
        )


def render_artifact(
    kind: str, inputs: Mapping[str, Any], context: Mapping[str, Any]
) -> str:
    """Deterministic text renderer per AI artifact kind.

    Production swaps this for an LLM call; the function is exported so the
    same output schema is shared between `StubProvider` and unit tests.
    """

    candidate_name = str(inputs.get("candidate_name", "Candidate")).strip() or "Candidate"
    job_title = str(inputs.get("job_title", "the role")).strip() or "the role"
    company = str(inputs.get("company", "the company")).strip() or "the company"
    skills = inputs.get("skills") or []
    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(",") if s.strip()]
    skills_text = ", ".join(skills[:6]) if skills else "the listed skills"

    if kind == "COVER_LETTER":
        return (
            f"Dear {company} hiring team,\n\n"
            f"I'm writing to apply for {job_title}. My background covers {skills_text}, "
            f"and I'd welcome the chance to bring that to your team.\n\n"
            f"Sincerely,\n{candidate_name}"
        )
    if kind == "RESUME_VARIANT":
        return (
            f"# {candidate_name}\n\n"
            f"## Summary\nTailored for {job_title} at {company}.\n\n"
            f"## Skills\n{skills_text}\n"
        )
    if kind == "CANDIDATE_SUMMARY":
        return (
            f"{candidate_name} — {len(skills)} relevant skills "
            f"({skills_text}). Profile aligned to {job_title} at {company}."
        )
    if kind == "MATCH_EXPLANATION":
        return (
            f"{candidate_name} matches {job_title} on {skills_text}. "
            f"Recommend short screening call to confirm fit."
        )
    if kind == "INTERVIEW_QA":
        questions = [
            f"Walk me through your experience with {s}." for s in (skills[:3] or ["your most recent role"])
        ]
        return "Suggested interview questions:\n- " + "\n- ".join(questions)
    if kind == "REJECTION_EMAIL":
        return (
            f"Hi {candidate_name},\n\nThank you for your interest in {job_title} "
            f"at {company}. We've decided to move forward with other candidates "
            f"whose experience more closely matched our current needs.\n\n"
            "We appreciate the time you invested.\n\nBest,\n"
            f"{company} Recruiting"
        )
    if kind == "SCREENING_QUESTIONS":
        return (
            "Suggested screening questions:\n"
            "1. What is your current notice period?\n"
            "2. What compensation range are you targeting?\n"
            f"3. Which of these are you strongest in: {skills_text}?\n"
            "4. Are you authorised to work in the role's primary location?"
        )
    if kind == "SHORTLIST_RECOMMENDATION":
        return (
            f"Recommend shortlisting {candidate_name} for {job_title}. "
            f"Skill overlap: {skills_text}. Suggested next step: phone screen."
        )
    return f"Auto-generated artifact for {kind}."
