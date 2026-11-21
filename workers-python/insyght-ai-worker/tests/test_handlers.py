import json
import threading

import orjson
import pytest
from conftest import FakeConsumer, FakeMessage, FakeProducer

from insyght_ai_worker import app
from insyght_ai_worker.app import build_handlers
from insyght_ai_worker.config import Settings
from insyght_ai_worker.gateway import Embedding, GeneratedArtifact, StubGateway
from insyght_ai_worker.handlers import embed, generate_artifact, parse_resume
from insyght_ai_worker.runtime import consume, encode_key

TENANT = "33333333-3333-3333-3333-333333333333"
RESUME_EVENT = {
    "resume_id": "11111111-1111-1111-1111-111111111111",
    "candidate_id": "22222222-2222-2222-2222-222222222222",
    "tenant_id": TENANT,
    "s3_key": f"tenants/{TENANT}/candidates/y/resumes/z/alex_lee_resume.pdf",
    "mime_type": "application/pdf",
}


class RecordingGateway:
    def __init__(self):
        self.calls = []

    def generate_artifact(self, *, tenant_id, kind, inputs, context):
        self.calls.append(("generate_artifact", tenant_id, kind))
        return GeneratedArtifact("text", None, "m1", "p1")

    def embed(self, *, tenant_id, text):
        self.calls.append(("embed", tenant_id, text))
        return Embedding([0.0, 1.0], "m-embed")


def _run(handler, messages, tp="tp-0"):
    stop = threading.Event()
    consumer = FakeConsumer(polls=[{tp: messages}], stop=stop)
    producer = FakeProducer()
    consume(handler, consumer, producer, stop, commit_offset=lambda n: n, poll_timeout_ms=0)
    return consumer, producer


def test_parse_resume_emits_parsed_event_keyed_by_candidate_and_commits(settings, no_s3):
    handler = parse_resume.build(settings, s3=no_s3)
    consumer, producer = _run(handler, [FakeMessage(json.dumps(RESUME_EVENT), offset=41)])

    [(topic, key, value)] = producer.sent
    assert topic == "jobocate.resume.parsed"
    assert key == RESUME_EVENT["candidate_id"]
    assert value["failed"] is False and value["tenant_id"] == TENANT
    assert consumer.commits == [{"tp-0": 42}]


def test_parse_resume_failure_emits_failed_event(settings, no_s3, monkeypatch):
    def boom(*_a, **_k):
        raise RuntimeError("parser blew up")

    monkeypatch.setattr(parse_resume, "parse_resume_upload_event", boom)
    handler = parse_resume.build(settings, s3=no_s3)
    _, producer = _run(handler, [FakeMessage(json.dumps(RESUME_EVENT), offset=0)])

    [(topic, key, value)] = producer.sent
    assert topic == "jobocate.resume.parsed"
    assert key is None
    assert value["failed"] is True and value["resume_id"] == RESUME_EVENT["resume_id"]


def test_parse_resume_drops_unparseable_message_but_still_commits(settings, no_s3):
    handler = parse_resume.build(settings, s3=no_s3)
    consumer, producer = _run(handler, [FakeMessage("not json", offset=7)])
    assert producer.sent == []
    assert consumer.commits == [{"tp-0": 8}]


def test_embed_goes_through_gateway_with_tenant(settings):
    gw = RecordingGateway()
    payload = {"tenant_id": TENANT, "target": {"type": "candidate", "id": "c1"}, "text": "kafka"}
    _, producer = _run(embed.build(settings, gw), [FakeMessage(json.dumps(payload), offset=0)])

    assert gw.calls == [("embed", TENANT, "kafka")]
    [(topic, key, value)] = producer.sent
    assert topic == "jobocate.embedding.ready"
    assert key == TENANT
    assert value == {
        "type": "EMBEDDING_READY",
        "tenant_id": TENANT,
        "target": payload["target"],
        "vector": [0.0, 1.0],
        "model": "m-embed",
    }


def test_generate_artifact_posts_result_for_the_events_tenant(settings):
    gw = RecordingGateway()
    posts = []
    handler = generate_artifact.build(settings, gw, post=lambda path, tenant, body: posts.append((path, tenant, body)))
    evt = {
        "type": "ai.artifact.requested",
        "event_id": "evt-1",
        "artifact_id": "a1",
        "tenant_id": TENANT,
        "kind": "COVER_LETTER",
        "inputs": {"candidate_name": "Ada"},
    }
    _, producer = _run(handler, [FakeMessage(orjson.dumps(evt).decode(), offset=0)])

    assert producer.sent == []
    assert gw.calls == [("generate_artifact", TENANT, "COVER_LETTER")]
    assert posts == [
        (
            "/internal/v1/ai-artifacts/a1/result",
            TENANT,
            {"model_version": "m1", "prompt_version": "p1", "outputText": "text", "idempotencyKey": "evt-1"},
        )
    ]


def test_generate_artifact_reports_failure_when_gateway_fails(settings):
    class FailingGateway(RecordingGateway):
        def generate_artifact(self, **_kwargs):
            raise RuntimeError("model timeout")

    posts = []
    handler = generate_artifact.build(settings, FailingGateway(), post=lambda *a: posts.append(a))
    evt = {"type": "ai.artifact.requested", "artifact_id": "a1", "tenant_id": TENANT, "kind": "COVER_LETTER"}
    _run(handler, [FakeMessage(orjson.dumps(evt).decode(), offset=0)])

    assert posts == [("/internal/v1/ai-artifacts/a1/failure", TENANT, {"reason": "model timeout"})]


def test_generate_artifact_ignores_events_without_tenant(settings):
    posts = []
    handler = generate_artifact.build(settings, StubGateway(), post=lambda *a: posts.append(a))
    evt = {"type": "ai.artifact.requested", "artifact_id": "a1", "kind": "COVER_LETTER"}
    _run(handler, [FakeMessage(orjson.dumps(evt).decode(), offset=0)])
    assert posts == []


def test_all_handlers_build_with_the_stub_gateway():
    names = [h.name for h in build_handlers(Settings.from_env({}), StubGateway())]
    assert names == ["parse_resume", "embed", "generate_artifact"]


def test_keys_are_encoded_for_kafka():
    assert encode_key("abc") == b"abc"
    assert encode_key(None) is None


def test_parse_resume_for_another_tenants_object_emits_failed_event(settings, no_s3):
    evt = dict(RESUME_EVENT, s3_key="tenants/someone-else/candidates/y/resumes/z/cv.pdf")
    _, producer = _run(parse_resume.build(settings, s3=no_s3), [FakeMessage(json.dumps(evt), offset=0)])
    [(_topic, _key, value)] = producer.sent
    assert value["failed"] is True


def test_parse_resume_skips_events_without_tenant(settings, no_s3):
    evt = {k: v for k, v in RESUME_EVENT.items() if k != "tenant_id"}
    consumer, producer = _run(parse_resume.build(settings, s3=no_s3), [FakeMessage(json.dumps(evt), offset=3)])
    assert producer.sent == []
    assert consumer.commits == [{"tp-0": 4}]


def test_embed_skips_requests_without_tenant(settings):
    gw = RecordingGateway()
    _, producer = _run(embed.build(settings, gw), [FakeMessage(json.dumps({"text": "x"}), offset=0)])
    assert gw.calls == []
    assert producer.sent == []


def test_manual_commit_happens_after_the_producer_flushes(settings, no_s3):
    events = []

    class OrderedProducer(FakeProducer):
        def flush(self):
            events.append("flush")

    class OrderedConsumer(FakeConsumer):
        def commit(self, offsets):
            events.append("commit")

    stop = threading.Event()
    consumer = OrderedConsumer(polls=[{"tp-0": [FakeMessage(json.dumps(RESUME_EVENT), offset=0)]}], stop=stop)
    consume(parse_resume.build(settings, s3=no_s3), consumer, OrderedProducer(), stop, lambda n: n, 0)
    assert events[:2] == ["flush", "commit"]


def test_run_exits_non_zero_when_a_handler_crashes(monkeypatch):
    def no_broker(*_args):
        raise RuntimeError("no brokers available")

    monkeypatch.setenv("INSYGHT_AI_WORKER_HANDLERS", "embed")
    monkeypatch.setattr(app, "kafka_clients", no_broker)
    monkeypatch.setattr(app.signal, "signal", lambda *_a: None)
    assert app.run() == 1


def test_empty_internal_token_is_not_replaced_by_the_dev_default():
    assert Settings.from_env({"JOBOCATE_INTERNAL_TOKEN": ""}).internal_token == ""


@pytest.mark.parametrize("name", ["parse_resume", "embed", "generate_artifact"])
def test_each_handler_can_run_alone(name):
    handlers = build_handlers(Settings.from_env({"INSYGHT_AI_WORKER_HANDLERS": name}), StubGateway())
    assert [h.name for h in handlers] == [name]
