import pytest

from insyght_ai_worker.config import ALL_HANDLERS, Settings


def test_defaults_keep_the_old_workers_topics_and_groups():
    s = Settings.from_env({})
    assert (s.resume_in_topic, s.resume_out_topic, s.resume_group) == (
        "jobocate.resume.raw",
        "jobocate.resume.parsed",
        "jobocate-resume-parser",
    )
    assert (s.embed_in_topic, s.embed_out_topic, s.embed_group) == (
        "jobocate.embedding.request",
        "jobocate.embedding.ready",
        "jobocate-embedding-worker",
    )
    assert (s.artifact_in_topic, s.artifact_group) == (
        "jobocate.ai.artifact.events",
        "jobocate-ai-artifact-worker",
    )
    assert s.handlers == ALL_HANDLERS


def test_old_env_overrides_still_apply():
    s = Settings.from_env({"KAFKA_TOPIC_RESUME_RAW": "custom.raw", "KAFKA_GROUP_EMBEDDING_WORKER": "g"})
    assert s.resume_in_topic == "custom.raw"
    assert s.embed_group == "g"


def test_handlers_can_be_limited():
    assert Settings.from_env({"INSYGHT_AI_WORKER_HANDLERS": "embed, parse_resume"}).handlers == (
        "embed",
        "parse_resume",
    )


def test_unknown_handler_is_rejected():
    with pytest.raises(ValueError, match="unknown handlers"):
        Settings.from_env({"INSYGHT_AI_WORKER_HANDLERS": "parse_resume,summarise"})
