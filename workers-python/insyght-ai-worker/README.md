# insyght-ai-worker

The one Python worker (ADR-0001, IATS-151). It replaces `resume-parser-worker`, `embedding-worker` and
`ai-artifact-worker`, and keeps their topics, consumer groups and environment variables.

| Handler | Consumes (group) | Produces | Model call |
|---|---|---|---|
| `parse_resume` | `jobocate.resume.raw` (`jobocate-resume-parser`) | `jobocate.resume.parsed` | none yet (regex and heuristics) |
| `embed` | `jobocate.embedding.request` (`jobocate-embedding-worker`) | `jobocate.embedding.ready` | `AiGateway.embed` |
| `generate_artifact` | `jobocate.ai.artifact.events` (`jobocate-ai-artifact-worker`) | POST to application-service `/internal/v1/ai-artifacts/{id}/result` or `/failure` | `AiGateway.generate_artifact` |

Handlers never call a model provider directly. They call `gateway.AiGateway`. Until the AI gateway (IATS-104) exists,
the only implementation is `StubGateway`, which returns deterministic output and needs no keys or network.
Generated artifacts are drafts for a recruiter to review; this worker never rejects, advances or contacts a candidate.

## Run

```bash
python -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"
python -m insyght_ai_worker                                  # every handler, one consumer thread each
INSYGHT_AI_WORKER_HANDLERS=parse_resume python -m insyght_ai_worker
```

| Variable | Default |
|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:19092` |
| `INSYGHT_AI_WORKER_HANDLERS` | `parse_resume,embed,generate_artifact` |
| `AI_GATEWAY` (or the old `AI_ARTIFACT_PROVIDER`) | `stub` |
| `APPLICATION_SERVICE_INTERNAL_URL` | `http://localhost:8084` |
| `JOBOCATE_INTERNAL_TOKEN` | dev token |
| `JOBOCATE_S3_ENABLED`, `S3_*` | see `resume/storage.py` |
| Topic and group overrides | the old names, for example `KAFKA_TOPIC_RESUME_RAW`, `KAFKA_GROUP_EMBEDDING_WORKER` |

## Test

```bash
ruff check . && PYTHONPATH=src pytest
```

The tests drive the real consume loop with fake Kafka clients. `tests/test_kafka_adapter.py` checks the values we pass
to kafka-python against its real types.
