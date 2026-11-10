from resume_parser_worker.normalize import (
    extract_email,
    extract_phone,
    extract_skills,
    extract_years_experience,
    guess_full_name,
    normalize_text,
)


def test_normalize_collapses_whitespace_and_nbsp():
    assert normalize_text("  hello\u00a0  world  ") == "hello world"


def test_extract_email_returns_lowercase():
    assert extract_email("contact: ALEX.LEE@example.com — Senior Eng") == "alex.lee@example.com"


def test_extract_phone_picks_first_plausible():
    assert extract_phone("Phone: +1 (415) 555-0102") == "+14155550102"


def test_extract_phone_rejects_too_short():
    assert extract_phone("Order #4321") is None


def test_extract_skills_matches_vocab_only():
    text = "Built services in Python, Java and Go. Used Kafka and PostgreSQL."
    assert set(extract_skills(text)) == {"python", "java", "go", "kafka", "postgresql"}


def test_extract_years_picks_largest():
    assert extract_years_experience("8+ years backend, 12 years total") == 12.0


def test_guess_full_name_takes_first_name_line():
    text = "Alex Lee\nSenior Engineer\nSan Francisco"
    assert guess_full_name(text) == "Alex Lee"


def test_guess_full_name_returns_none_when_unparseable():
    assert guess_full_name("RESUME — 2026 v1") is None
