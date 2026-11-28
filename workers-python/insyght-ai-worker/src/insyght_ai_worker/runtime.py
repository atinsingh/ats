"""Kafka plumbing shared by every handler.

Handlers are plain functions from a raw message to the messages they want to send, so the loop
below is the only code that touches Kafka. Tests drive it with fake clients.
"""

from __future__ import annotations

import json
import logging
import threading
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Protocol

log = logging.getLogger("insyght-ai-worker.runtime")


@dataclass(frozen=True)
class Outgoing:
    topic: str
    value: dict[str, Any]
    key: str | None = None


@dataclass(frozen=True)
class Handler:
    name: str
    in_topic: str
    group: str
    handle: Callable[[str], list[Outgoing]]
    # Called with the raw message when `handle` raises. Returns messages to send instead.
    on_error: Callable[[str], list[Outgoing]] = field(default=lambda _raw: [])
    # True: commit after each processed batch (at-least-once). False: Kafka auto-commit.
    manual_commit: bool = False


class Consumer(Protocol):
    def poll(self, timeout_ms: int) -> dict[Any, list[Any]]: ...
    def commit(self, offsets: dict[Any, Any]) -> None: ...
    def close(self) -> None: ...


class Producer(Protocol):
    def send(self, topic: str, value: Any = None, key: Any = None) -> Any: ...
    def flush(self) -> None: ...
    def close(self) -> None: ...


def process_batch(handler: Handler, batch: list[Any], producer: Producer) -> None:
    for msg in batch:
        try:
            outgoing = handler.handle(msg.value)
        except Exception:
            log.exception("handler_failed handler=%s offset=%s", handler.name, getattr(msg, "offset", "?"))
            outgoing = handler.on_error(msg.value)
        for out in outgoing:
            producer.send(out.topic, key=out.key, value=out.value)


def consume(
    handler: Handler,
    consumer: Consumer,
    producer: Producer,
    stop: threading.Event,
    commit_offset: Callable[[int], Any],
    poll_timeout_ms: int = 1000,
) -> None:
    """Poll until `stop` is set. `commit_offset(n)` builds the value Kafka expects for offset n."""
    log.info("started handler=%s topic=%s group=%s", handler.name, handler.in_topic, handler.group)
    while not stop.is_set():
        records = consumer.poll(timeout_ms=poll_timeout_ms)
        if not records:
            continue
        for tp, batch in records.items():
            process_batch(handler, batch, producer)
            if handler.manual_commit:
                producer.flush()
                consumer.commit({tp: commit_offset(batch[-1].offset + 1)})
        producer.flush()


def kafka_clients(handler: Handler, brokers: str) -> tuple[Consumer, Producer, Callable[[int], Any]]:
    """Real kafka-python clients. Imported lazily so tests never need a broker or the package."""
    from kafka import KafkaConsumer, KafkaProducer

    consumer = KafkaConsumer(
        handler.in_topic,
        bootstrap_servers=brokers,
        group_id=handler.group,
        enable_auto_commit=not handler.manual_commit,
        auto_offset_reset="earliest",
        value_deserializer=lambda v: v.decode("utf-8"),
    )
    producer = KafkaProducer(
        bootstrap_servers=brokers,
        acks="all",
        key_serializer=encode_key,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
    return consumer, producer, kafka_offset


def kafka_offset(offset: int) -> Any:
    """The commit value kafka-python accepts. The old resume worker passed a bare int, which it rejects."""
    from kafka.structs import OffsetAndMetadata

    # kafka-python 2.0 has (offset, metadata); later versions add leader_epoch (-1 = unknown).
    extra = [-1] * (len(OffsetAndMetadata._fields) - 2)
    return OffsetAndMetadata(offset, "", *extra)


def encode_key(key: Any) -> bytes | None:
    """Kafka needs bytes keys. The old workers sent str keys, which kafka-python rejects."""
    if key is None:
        return None
    return str(key).encode("utf-8")
