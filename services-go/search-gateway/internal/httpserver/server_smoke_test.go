package httpserver

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// newTestServer wires a Server with a stub *opensearch.Client. We never
// actually call OpenSearch here — these tests cover request parsing,
// authorization, and routing only.
func newTestServer(t *testing.T) *Server {
	t.Helper()
	cfg := Config{
		HTTPAddr:           ":0",
		OpenSearchURL:      "http://localhost:0",
		InternalIndexToken: "test-token",
		JobIndex:           "test-jobs",
		IndexRefresh:       "false",
	}
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	return &Server{cfg: cfg, log: logger, client: nil}
}

func TestHealthzReturnsOK(t *testing.T) {
	s := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	s.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"status":"ok"`) {
		t.Fatalf("unexpected body: %s", rec.Body.String())
	}
}

func TestSearchJobsGet_RequiresTenant(t *testing.T) {
	s := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/search/jobs?q=eng", nil)
	s.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d", rec.Code)
	}
}

func TestSearchJobsGet_RejectsBadQueryParams(t *testing.T) {
	s := newTestServer(t)
	rec := httptest.NewRecorder()
	u := "/v1/search/jobs?" + url.Values{"employment_type": {"PERMANENT"}}.Encode()
	req := httptest.NewRequest(http.MethodGet, u, nil)
	req.Header.Set(tenantHeader, "00000000-0000-0000-0000-000000000001")
	s.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestInternalIndex_RequiresToken(t *testing.T) {
	s := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/internal/v1/index/jobs", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	s.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d", rec.Code)
	}
}

func TestInternalIndex_RejectsBadDocument(t *testing.T) {
	s := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/internal/v1/index/jobs", strings.NewReader(`{"tenant_id":"t"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", "test-token")
	s.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestAutocomplete_RequiresTenantAndShortQueryEmpty(t *testing.T) {
	s := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/search/jobs/autocomplete?q=a", nil)
	req.Header.Set(tenantHeader, "00000000-0000-0000-0000-000000000001")
	s.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 with empty suggestions got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), `"suggestions":[]`) {
		t.Fatalf("expected empty suggestions, got %s", rec.Body.String())
	}
}
