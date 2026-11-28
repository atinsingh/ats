"""Checks against the real kafka-python types. Skipped only where kafka-python is not installed."""

import pytest

from insyght_ai_worker.runtime import kafka_offset

kafka = pytest.importorskip("kafka")


def test_commit_value_is_what_kafka_python_accepts():
    from kafka.structs import OffsetAndMetadata

    value = kafka_offset(42)
    assert isinstance(value, OffsetAndMetadata)
    assert value.offset == 42

