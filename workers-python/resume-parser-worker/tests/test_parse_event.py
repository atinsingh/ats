from resume_parser_worker.kafka_worker import parse_resume_upload_event
from resume_parser_worker.storage import S3Settings


DISABLED_S3 = S3Settings(
    enabled=False,
    endpoint=None,
    region="us-east-1",
    access_key="",
    secret_key="",
    bucket="resumes",
)


def test_parse_event_emits_canonical_envelope():
    payload = {
        "resume_id": "11111111-1111-1111-1111-111111111111",
        "candidate_id": "22222222-2222-2222-2222-222222222222",
        "tenant_id": "33333333-3333-3333-3333-333333333333",
        "s3_key": "tenants/x/candidates/y/resumes/z/alex_lee_resume.pdf",
        "mime_type": "application/pdf",
    }
    out = parse_resume_upload_event(payload, settings=DISABLED_S3)

    assert out["type"] == "RESUME_PARSED"
    assert out["schema_version"] == "v1"
    assert out["resume_id"] == payload["resume_id"]
    assert out["candidate_id"] == payload["candidate_id"]
    assert out["tenant_id"] == payload["tenant_id"]
    assert out["failed"] is False
    assert out["parser_version"]
    assert out["event_id"]  # uuid


def test_parse_event_includes_filename_hint_when_no_text():
    payload = {
        "resume_id": "11111111-1111-1111-1111-111111111111",
        "candidate_id": "22222222-2222-2222-2222-222222222222",
        "s3_key": "tenants/x/candidates/y/resumes/z/Alex_Lee_Senior_Engineer.docx",
        "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    out = parse_resume_upload_event(payload, settings=DISABLED_S3)
    assert out["structured"]["headline_guess"] == "Alex Lee Senior Engineer"
