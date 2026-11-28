from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import pytest

from insyght_ai_worker.config import Settings
from insyght_ai_worker.resume.storage import S3Settings


@dataclass
class FakeMessage:
    value: str
    offset: int


@dataclass
class FakeProducer:
    sent: list[tuple[str, Any, Any]] = field(default_factory=list)
    flushes: int = 0

    def send(self, topic: str, value: Any = None, key: Any = None) -> None:
        self.sent.append((topic, key, value))

    def flush(self) -> None:
        self.flushes += 1

    def close(self) -> None:
        pass


@dataclass
class FakeConsumer:
    """Returns each queued poll result once, then sets the stop event."""

    polls: list[dict[Any, list[FakeMessage]]]
    stop: Any
    commits: list[dict[Any, Any]] = field(default_factory=list)

    def poll(self, timeout_ms: int) -> dict[Any, list[FakeMessage]]:
        if not self.polls:
            self.stop.set()
            return {}
        return self.polls.pop(0)

    def commit(self, offsets: dict[Any, Any]) -> None:
        self.commits.append(offsets)

    def close(self) -> None:
        pass


@pytest.fixture
def settings() -> Settings:
    return Settings.from_env({})


@pytest.fixture
def no_s3() -> S3Settings:
    return S3Settings(
        enabled=False, endpoint=None, region="us-east-1", access_key="", secret_key="", bucket="resumes"
    )
