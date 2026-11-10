from ai_artifact_worker.renderer import StubProvider, render_artifact


def test_cover_letter_includes_company_and_skills():
    text = render_artifact(
        "COVER_LETTER",
        {
            "candidate_name": "Ada Lovelace",
            "job_title": "Staff Engineer",
            "company": "Acme",
            "skills": ["Java", "Postgres", "Kafka"],
        },
        {},
    )
    assert "Acme hiring team" in text
    assert "Staff Engineer" in text
    assert "Java" in text
    assert text.endswith("Ada Lovelace")


def test_match_explanation_describes_overlap():
    text = render_artifact(
        "MATCH_EXPLANATION",
        {
            "candidate_name": "Grace Hopper",
            "job_title": "Compiler PM",
            "company": "Mil Spec",
            "skills": ["compilers", "type systems"],
        },
        {},
    )
    assert "Grace Hopper" in text
    assert "compilers" in text


def test_unknown_kind_falls_back_to_generic():
    assert render_artifact("WAT", {}, {}) == "Auto-generated artifact for WAT."


def test_stub_provider_returns_payload_with_versions():
    provider = StubProvider()
    artifact = provider.generate(
        kind="CANDIDATE_SUMMARY",
        inputs={"candidate_name": "Linus", "skills": ["c", "kernel"]},
        context={},
    )
    payload = artifact.to_payload(idempotency_key="evt-1")
    assert payload["model_version"] == provider.model_id
    assert payload["prompt_version"] == provider.prompt_version
    assert payload["idempotencyKey"] == "evt-1"
    assert "Linus" in payload["outputText"]
