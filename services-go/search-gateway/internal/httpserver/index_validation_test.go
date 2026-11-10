package httpserver

import "testing"

func TestValidateIndexDocument_RequiresKeys(t *testing.T) {
	cases := []map[string]any{
		{},
		{"tenant_id": "t"},
		{"tenant_id": "t", "job_id": "j"},
		{"tenant_id": "t", "job_id": "j", "title": "ti"},
		{"tenant_id": "t", "job_id": "j", "title": "ti", "status": "BAD"},
	}
	for i, doc := range cases {
		if err := validateIndexDocument(doc); err == nil {
			t.Fatalf("case %d: expected error for %+v", i, doc)
		}
	}
}

func TestValidateIndexDocument_AcceptsCanonical(t *testing.T) {
	good := map[string]any{
		"tenant_id": "t",
		"job_id":    "j",
		"title":     "ti",
		"status":    "PUBLISHED",
	}
	if err := validateIndexDocument(good); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
