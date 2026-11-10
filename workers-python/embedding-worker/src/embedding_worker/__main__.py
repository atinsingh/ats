from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import signal
import sys
import time
from typing import Any

from kafka import KafkaConsumer, KafkaProducer

log = logging.getLogger("embedding-worker")


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default).strip()


def _fake_embedding(text: str, dim: int = 128) -> list[float]:
    """
    Deterministic pseudo-embedding for local/dev only.
    Replace with a call to your embedding model endpoint in real deployments.
    """
    seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:8], 16)
    rng = seed
    out: list[float] = []
    for i in range(dim):
        rng = (1103515245 * rng + 12345) & 0x7FFFFFFF
        out.append((rng % 1000) / 1000.0 - 0.5)
    norm = math.sqrt(sum(x * x for x in out)) or 1.0
    return [x / norm for x in out]


def run() -> int:
    logging.basicConfig(level=_env("LOG_LEVEL", "INFO"), format="%(message)s", stream=sys.stdout)

    brokers = _env("KAFKA_BOOTSTRAP_SERVERS", "localhost:19092")
    in_topic = _env("KAFKA_TOPIC_EMBEDDING_REQUEST", "jobocate.embedding.request")
    out_topic = _env("KAFKA_TOPIC_EMBEDDING_READY", "jobocate.embedding.ready")
    group = _env("KAFKA_GROUP_EMBEDDING_WORKER", "jobocate-embedding-worker")

    consumer = KafkaConsumer(
        in_topic,
        bootstrap_servers=brokers,
        group_id=group,
        enable_auto_commit=True,
        auto_offset_reset="earliest",
        value_deserializer=lambda v: v.decode("utf-8"),
    )
    producer = KafkaProducer(
        bootstrap_servers=brokers,
        acks="all",
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )

    stop = False

    def _handle_sig(*_args: Any) -> None:
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, _handle_sig)
    signal.signal(signal.SIGTERM, _handle_sig)

    log.info("started", extra={"in": in_topic, "out": out_topic, "group": group})
    while not stop:
        records = consumer.poll(timeout_ms=1000)
        if not records:
            continue
        for _tp, batch in records.items():
            for msg in batch:
                try:
                    payload = json.loads(msg.value)
                    text = str(payload.get("text", ""))
                    vector = _fake_embedding(text)
                    out = {
                        "type": "EMBEDDING_READY",
                        "tenant_id": payload.get("tenant_id"),
                        "target": payload.get("target"),
                        "vector": vector,
                        "model": "pseudo-dev",
                    }
                    producer.send(out_topic, key=str(payload.get("tenant_id", "")), value=out)
                except Exception:
                    log.exception("embedding_failed")
        producer.flush()

    consumer.close()
    producer.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
