"""Deterministic artifact text used by the stub AI gateway.

Moved from ai-artifact-worker. It keeps the output shape of each `AiArtifactKind` so the UI can
be built before any model keys exist. Only `gateway.StubGateway` calls it.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any


def render_artifact(
    kind: str, inputs: Mapping[str, Any], context: Mapping[str, Any]
) -> str:
    """Deterministic text renderer per AI artifact kind."""

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
