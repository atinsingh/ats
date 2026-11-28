"""Process entrypoint: one consumer thread per enabled handler."""

from __future__ import annotations

import logging
import signal
import sys
import threading
from typing import Any

from insyght_ai_worker.config import Settings
from insyght_ai_worker.gateway import AiGateway, select_gateway
from insyght_ai_worker.handlers import embed, generate_artifact, parse_resume
from insyght_ai_worker.runtime import Handler, consume, kafka_clients

log = logging.getLogger("insyght-ai-worker")


def build_handlers(settings: Settings, gateway: AiGateway) -> list[Handler]:
    builders = {
        "parse_resume": lambda: parse_resume.build(settings),
        "embed": lambda: embed.build(settings, gateway),
        "generate_artifact": lambda: generate_artifact.build(settings, gateway),
    }
    return [builders[name]() for name in settings.handlers]


def run() -> int:
    import os

    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO").strip(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        stream=sys.stdout,
    )
    settings = Settings.from_env()
    handlers = build_handlers(settings, select_gateway())
    stop = threading.Event()

    def _handle_sig(*_args: Any) -> None:
        stop.set()

    signal.signal(signal.SIGINT, _handle_sig)
    signal.signal(signal.SIGTERM, _handle_sig)

    crashed: list[str] = []
    threads = []
    for handler in handlers:

        def _run(h: Handler = handler) -> None:
            clients = None
            try:
                clients = kafka_clients(h, settings.brokers)
                consume(h, clients[0], clients[1], stop, clients[2])
            except Exception:
                log.exception("handler_crashed handler=%s", h.name)
                crashed.append(h.name)
                stop.set()  # one handler down stops the process, which exits non-zero so it is restarted
            finally:
                if clients:
                    clients[0].close()
                    clients[1].close()

        t = threading.Thread(target=_run, name=handler.name, daemon=True)
        t.start()
        threads.append(t)

    log.info("running handlers=%s", [h.name for h in handlers])
    for t in threads:
        t.join()
    if crashed:
        log.error("exiting_after_crash handlers=%s", crashed)
        return 1
    return 0
