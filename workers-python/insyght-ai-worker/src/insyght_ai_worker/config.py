"""Environment settings. Names and defaults are the ones the three old workers used."""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass

ALL_HANDLERS = ("parse_resume", "embed", "generate_artifact")


@dataclass(frozen=True)
class Settings:
    brokers: str
    handlers: tuple[str, ...]
    resume_in_topic: str
    resume_out_topic: str
    resume_group: str
    embed_in_topic: str
    embed_out_topic: str
    embed_group: str
    artifact_in_topic: str
    artifact_group: str
    application_service_url: str
    internal_token: str

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> Settings:
        env = os.environ if env is None else env

        def get(name: str, default: str) -> str:
            return env.get(name, default).strip()

        requested = tuple(
            h.strip() for h in get("INSYGHT_AI_WORKER_HANDLERS", ",".join(ALL_HANDLERS)).split(",") if h.strip()
        )
        unknown = [h for h in requested if h not in ALL_HANDLERS]
        if unknown:
            raise ValueError(f"unknown handlers {unknown}; choose from {list(ALL_HANDLERS)}")

        return cls(
            brokers=get("KAFKA_BOOTSTRAP_SERVERS", "localhost:19092"),
            handlers=requested,
            resume_in_topic=get("KAFKA_TOPIC_RESUME_RAW", "jobocate.resume.raw"),
            resume_out_topic=get("KAFKA_TOPIC_RESUME_PARSED", "jobocate.resume.parsed"),
            resume_group=get("KAFKA_GROUP_RESUME_PARSER", "jobocate-resume-parser"),
            embed_in_topic=get("KAFKA_TOPIC_EMBEDDING_REQUEST", "jobocate.embedding.request"),
            embed_out_topic=get("KAFKA_TOPIC_EMBEDDING_READY", "jobocate.embedding.ready"),
            embed_group=get("KAFKA_GROUP_EMBEDDING_WORKER", "jobocate-embedding-worker"),
            artifact_in_topic=get("KAFKA_TOPIC_AI_ARTIFACT_EVENTS", "jobocate.ai.artifact.events"),
            artifact_group=get("KAFKA_GROUP_AI_ARTIFACT_WORKER", "jobocate-ai-artifact-worker"),
            application_service_url=get("APPLICATION_SERVICE_INTERNAL_URL", "http://localhost:8084"),
            internal_token=get("JOBOCATE_INTERNAL_TOKEN", "jobocate-internal-dev-token"),
        )
