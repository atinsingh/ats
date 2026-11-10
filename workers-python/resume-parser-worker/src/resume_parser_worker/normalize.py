from __future__ import annotations

import re
from typing import Iterable

_WS = re.compile(r"\s+")
_EMAIL = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_PHONE = re.compile(
    r"(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}"
)
_YEARS = re.compile(r"(\d{1,2})\+?\s*(?:years|yrs)\b", re.IGNORECASE)


def normalize_text(value: str) -> str:
    """Deterministic normalization for downstream indexing and dedupe."""
    cleaned = value.replace("\u00a0", " ").strip()
    cleaned = _WS.sub(" ", cleaned)
    return cleaned


def extract_headline_from_filename(filename: str) -> str | None:
    base = filename.rsplit("/", 1)[-1]
    if not base:
        return None
    stem = base.rsplit(".", 1)[0]
    stem = stem.replace("_", " ").replace("-", " ")
    return normalize_text(stem) if stem else None


def extract_email(text: str) -> str | None:
    if not text:
        return None
    m = _EMAIL.search(text)
    return m.group(0).lower() if m else None


def extract_phone(text: str) -> str | None:
    if not text:
        return None
    m = _PHONE.search(text)
    if not m:
        return None
    raw = m.group(0)
    digits = re.sub(r"[^\d+]", "", raw)
    return digits if len(re.sub(r"\D", "", digits)) >= 7 else None


def extract_years_experience(text: str) -> float | None:
    if not text:
        return None
    matches = [int(m.group(1)) for m in _YEARS.finditer(text)]
    if not matches:
        return None
    return float(max(matches))


# Curated MVP skill dictionary. Real systems back this with a tenant-scoped
# taxonomy + ML normalization; this stays deterministic for tests.
DEFAULT_SKILL_VOCAB: tuple[str, ...] = (
    "python",
    "java",
    "go",
    "golang",
    "typescript",
    "javascript",
    "node.js",
    "react",
    "next.js",
    "spring boot",
    "spring",
    "kafka",
    "postgresql",
    "postgres",
    "mysql",
    "redis",
    "opensearch",
    "elasticsearch",
    "aws",
    "gcp",
    "azure",
    "docker",
    "kubernetes",
    "terraform",
    "graphql",
    "rest",
    "rabbitmq",
    "scala",
    "rust",
    "c++",
    "ruby",
    "rails",
    "django",
    "fastapi",
    "flask",
    "html",
    "css",
    "tailwind",
    "ml",
    "nlp",
    "llm",
    "pytorch",
    "tensorflow",
)


_SKILL_WORD = re.compile(r"[a-z0-9][a-z0-9.+#]*[a-z0-9]|[a-z0-9]")


def extract_skills(text: str, vocab: Iterable[str] = DEFAULT_SKILL_VOCAB) -> list[str]:
    """Case-insensitive 1- and 2-gram match against a vocabulary.

    Words are anchored on alphanumerics so trailing punctuation like commas
    or periods don't split valid tokens (`Go.` → `go`), but inner punctuation
    that's part of the token survives (`node.js`, `c++`, `c#`).
    """
    if not text:
        return []
    lowered = text.lower()
    words = _SKILL_WORD.findall(lowered)
    tokens: set[str] = set(words)
    for a, b in zip(words, words[1:]):
        tokens.add(f"{a} {b}")

    found: list[str] = []
    seen: set[str] = set()
    for skill in vocab:
        key = skill.lower()
        if key in tokens and skill not in seen:
            seen.add(skill)
            found.append(skill)
    return found


def guess_full_name(text: str) -> str | None:
    """Heuristic: first non-empty line ≤ 5 words and ≥ 2 words is the name."""
    if not text:
        return None
    for line in text.splitlines():
        candidate = line.strip()
        if not candidate:
            continue
        words = candidate.split()
        if 2 <= len(words) <= 5 and all(w[:1].isalpha() for w in words):
            return candidate
        # Stop after a few non-empty lines so we don't pick up section headers
        return None
    return None
