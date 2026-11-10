package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/opensearch-project/opensearch-go/v2"
)

const tenantHeader = "X-Jobocate-Tenant-Id"

type Server struct {
	cfg    Config
	log    *slog.Logger
	client *opensearch.Client
}

func New(cfg Config, log *slog.Logger) (*Server, error) {
	client, err := opensearch.NewClient(opensearch.Config{
		Addresses: []string{cfg.OpenSearchURL},
	})
	if err != nil {
		return nil, err
	}
	s := &Server{cfg: cfg, log: log, client: client}
	if err := s.ensureJobIndex(context.Background()); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Server) Handler() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(s.requestLogger)

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	})

	r.Group(func(r chi.Router) {
		r.Use(jsonContentTypeOnPost)

		// Authenticated tenant search.
		r.Get("/v1/search/jobs", s.handleSearchJobsGet)
		r.Get("/v1/search/jobs/autocomplete", s.handleAutocompleteJobs)

		// Backwards-compatible POST kept for callers that prefer a JSON body.
		r.Post("/v1/search/jobs", s.handleSearchJobsPost)

		// Internal indexing endpoints — auth via shared token, tenant scope is
		// enforced by the calling service (search-orchestrator).
		r.Post("/internal/v1/index/jobs", s.handleInternalIndexJob)
		r.Post("/internal/v1/index/jobs/bulk", s.handleInternalIndexJobsBulk)
		r.Delete("/internal/v1/index/jobs/{job_id}", s.handleInternalDeleteJob)
	})
	return r
}

func jsonContentTypeOnPost(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			next.ServeHTTP(w, r)
			return
		}
		ct := r.Header.Get("Content-Type")
		if !strings.HasPrefix(ct, "application/json") {
			writeError(w, http.StatusUnsupportedMediaType, "content_type_must_be_application/json", "")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)
		s.log.Info("http_request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.Status(),
			"bytes", ww.BytesWritten(),
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id", middleware.GetReqID(r.Context()),
			"tenant", r.Header.Get(tenantHeader),
		)
	})
}

// ----- Authenticated tenant search ---------------------------------------------

func (s *Server) handleSearchJobsGet(w http.ResponseWriter, r *http.Request) {
	tenant := strings.TrimSpace(r.Header.Get(tenantHeader))
	if tenant == "" {
		writeError(w, http.StatusUnauthorized, "missing_tenant", "X-Jobocate-Tenant-Id header is required")
		return
	}
	params, err := ParseJobsSearchParams(r.URL.Query())
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_query_params", err.Error())
		return
	}
	body := buildJobsSearchBodyFromParams(tenant, params, nil)
	s.executeSearch(w, r.Context(), body, params)
}

func (s *Server) handleSearchJobsPost(w http.ResponseWriter, r *http.Request) {
	tenant := strings.TrimSpace(r.Header.Get(tenantHeader))
	if tenant == "" {
		writeError(w, http.StatusUnauthorized, "missing_tenant", "X-Jobocate-Tenant-Id header is required")
		return
	}

	type req struct {
		Query   string         `json:"query"`
		Filters map[string]any `json:"filters"`
		Vector  []float64      `json:"vector"`
		Limit   int            `json:"limit"`
	}
	var body req
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}
	if body.Limit <= 0 || body.Limit > 100 {
		body.Limit = 25
	}
	osBody := buildJobsSearchBody(tenant, body.Query, body.Filters, body.Limit, body.Vector)
	s.executeSearch(w, r.Context(), osBody, JobsSearchParams{Size: body.Limit, Page: 1})
}

func (s *Server) executeSearch(
	w http.ResponseWriter,
	_ context.Context,
	body map[string]any,
	params JobsSearchParams,
) {
	status, respBody, err := s.searchOS(body)
	if err != nil {
		s.log.Error("opensearch_search_failed", "error", err)
		writeError(w, http.StatusBadGateway, "search_failed", "")
		return
	}
	if status != http.StatusOK {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write(respBody)
		return
	}
	normalized, err := normalizeJobSearchResponse(respBody)
	if err != nil {
		s.log.Error("normalize_search_response_failed", "error", err)
		writeError(w, http.StatusBadGateway, "search_response_invalid", "")
		return
	}
	wrapped, err := wrapPaginatedResponse(normalized, params)
	if err != nil {
		s.log.Error("pagination_envelope_failed", "error", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(wrapped)
}

func wrapPaginatedResponse(normalized []byte, p JobsSearchParams) ([]byte, error) {
	var inner map[string]any
	if err := json.Unmarshal(normalized, &inner); err != nil {
		return nil, err
	}
	if p.Size > 0 {
		inner["page"] = p.Page
		inner["size"] = p.Size
	}
	return json.Marshal(inner)
}

// ----- Autocomplete ------------------------------------------------------------

func (s *Server) handleAutocompleteJobs(w http.ResponseWriter, r *http.Request) {
	tenant := strings.TrimSpace(r.Header.Get(tenantHeader))
	if tenant == "" {
		writeError(w, http.StatusUnauthorized, "missing_tenant", "")
		return
	}
	prefix := strings.TrimSpace(r.URL.Query().Get("q"))
	if len(prefix) < 2 {
		writeJSON(w, http.StatusOK, map[string]any{"suggestions": []any{}})
		return
	}
	limit := 10
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := parseBoundedInt(v, 1, 25); err == nil {
			limit = n
		}
	}
	body := map[string]any{
		"size": limit,
		"_source": []string{"job_id", "title", "company_name"},
		"query": map[string]any{
			"bool": map[string]any{
				"filter": []any{
					map[string]any{"term": map[string]any{"tenant_id": tenant}},
					map[string]any{"term": map[string]any{"status": "PUBLISHED"}},
				},
				"must": map[string]any{
					"multi_match": map[string]any{
						"query": prefix,
						"type":  "bool_prefix",
						"fields": []string{
							"title.completion",
							"title.completion._2gram",
							"title.completion._3gram",
						},
					},
				},
			},
		},
	}
	status, respBody, err := s.searchOS(body)
	if err != nil || status != http.StatusOK {
		writeError(w, http.StatusBadGateway, "autocomplete_failed", "")
		return
	}
	suggestions, err := extractAutocompleteSuggestions(respBody)
	if err != nil {
		writeError(w, http.StatusBadGateway, "autocomplete_response_invalid", "")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"suggestions": suggestions})
}

func extractAutocompleteSuggestions(raw []byte) ([]map[string]any, error) {
	var root map[string]any
	if err := json.Unmarshal(raw, &root); err != nil {
		return nil, err
	}
	hitsRoot, _ := root["hits"].(map[string]any)
	out := []map[string]any{}
	if rawHits, ok := hitsRoot["hits"].([]any); ok {
		for _, h := range rawHits {
			hm, _ := h.(map[string]any)
			src, _ := hm["_source"].(map[string]any)
			if src == nil {
				continue
			}
			suggestion := map[string]any{}
			if v, ok := src["job_id"]; ok {
				suggestion["job_id"] = v
			}
			if v, ok := src["title"]; ok {
				suggestion["title"] = v
			}
			if v, ok := src["company_name"]; ok {
				suggestion["company_name"] = v
			}
			out = append(out, suggestion)
		}
	}
	return out, nil
}

// ----- Internal indexing endpoints --------------------------------------------

func (s *Server) handleInternalIndexJob(w http.ResponseWriter, r *http.Request) {
	if !s.authorizeInternal(r) {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	var doc map[string]any
	if err := json.NewDecoder(r.Body).Decode(&doc); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}
	if err := validateIndexDocument(doc); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_document", err.Error())
		return
	}
	doc["indexed_at"] = time.Now().UTC().Format(time.RFC3339Nano)

	jobID, _ := doc["job_id"].(string)
	payload, _ := json.Marshal(doc)
	res, err := s.client.Index(
		s.cfg.JobIndex,
		bytes.NewReader(payload),
		s.client.Index.WithDocumentID(jobID),
		s.client.Index.WithRefresh(s.cfg.IndexRefresh),
		s.client.Index.WithContext(r.Context()),
	)
	if err != nil {
		s.log.Error("opensearch_index_failed", "error", err, "job_id", jobID)
		writeError(w, http.StatusBadGateway, "index_failed", "")
		return
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(res.StatusCode)
	_, _ = w.Write(b)
}

// handleInternalIndexJobsBulk accepts {"items":[ ...job-index-document... ]}
// and uses the OpenSearch _bulk API for throughput. Each item is validated
// independently; a single bad item rejects the whole batch.
func (s *Server) handleInternalIndexJobsBulk(w http.ResponseWriter, r *http.Request) {
	if !s.authorizeInternal(r) {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	var req struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}
	if len(req.Items) == 0 {
		writeError(w, http.StatusBadRequest, "empty_batch", "items must not be empty")
		return
	}
	if len(req.Items) > 500 {
		writeError(w, http.StatusBadRequest, "batch_too_large", "max 500 items per request")
		return
	}

	var bulk bytes.Buffer
	for i, doc := range req.Items {
		if err := validateIndexDocument(doc); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_document",
				fmt.Sprintf("items[%d]: %s", i, err.Error()))
			return
		}
		doc["indexed_at"] = time.Now().UTC().Format(time.RFC3339Nano)
		jobID := doc["job_id"].(string)

		header, _ := json.Marshal(map[string]any{
			"index": map[string]any{
				"_index": s.cfg.JobIndex,
				"_id":    jobID,
			},
		})
		body, _ := json.Marshal(doc)
		bulk.Write(header)
		bulk.WriteByte('\n')
		bulk.Write(body)
		bulk.WriteByte('\n')
	}

	res, err := s.client.Bulk(
		bytes.NewReader(bulk.Bytes()),
		s.client.Bulk.WithRefresh(s.cfg.IndexRefresh),
		s.client.Bulk.WithContext(r.Context()),
	)
	if err != nil {
		s.log.Error("opensearch_bulk_failed", "error", err)
		writeError(w, http.StatusBadGateway, "index_failed", "")
		return
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(res.StatusCode)
	_, _ = w.Write(b)
}

func (s *Server) handleInternalDeleteJob(w http.ResponseWriter, r *http.Request) {
	if !s.authorizeInternal(r) {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	jobID := strings.TrimSpace(chi.URLParam(r, "job_id"))
	if jobID == "" {
		writeError(w, http.StatusBadRequest, "missing_job_id", "")
		return
	}
	res, err := s.client.Delete(
		s.cfg.JobIndex,
		jobID,
		s.client.Delete.WithRefresh(s.cfg.IndexRefresh),
		s.client.Delete.WithContext(r.Context()),
	)
	if err != nil {
		s.log.Error("opensearch_delete_failed", "error", err, "job_id", jobID)
		writeError(w, http.StatusBadGateway, "delete_failed", "")
		return
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(res.StatusCode)
	_, _ = w.Write(b)
}

func (s *Server) authorizeInternal(r *http.Request) bool {
	expected := s.cfg.InternalIndexToken
	if expected == "" {
		return false
	}
	got := r.Header.Get("X-Internal-Token")
	return got != "" && got == expected
}

// validateIndexDocument enforces the schema invariants the gateway must guard
// before writing into OpenSearch. Full schema validation lives in the
// shared-contracts package; the gateway just protects the fields it relies on.
func validateIndexDocument(doc map[string]any) error {
	must := []string{"tenant_id", "job_id", "title", "status"}
	for _, k := range must {
		v, ok := doc[k].(string)
		if !ok || strings.TrimSpace(v) == "" {
			return fmt.Errorf("missing required field: %s", k)
		}
	}
	status := doc["status"].(string)
	switch status {
	case "DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED":
	default:
		return fmt.Errorf("invalid status: %s", status)
	}
	return nil
}

// ----- OpenSearch helpers ------------------------------------------------------

func (s *Server) searchOS(body map[string]any) (int, []byte, error) {
	payload, err := json.Marshal(body)
	if err != nil {
		return 0, nil, err
	}
	res, err := s.client.Search(
		s.client.Search.WithIndex(s.cfg.JobIndex),
		s.client.Search.WithBody(bytes.NewReader(payload)),
	)
	if err != nil {
		return 0, nil, err
	}
	defer res.Body.Close()
	b, err := io.ReadAll(res.Body)
	return res.StatusCode, b, err
}

func (s *Server) ensureJobIndex(ctx context.Context) error {
	createBody := jobIndexCreateBody()
	b, err := json.Marshal(createBody)
	if err != nil {
		return err
	}

	existsRes, err := s.client.Indices.Exists(
		[]string{s.cfg.JobIndex},
		s.client.Indices.Exists.WithContext(ctx),
	)
	if err != nil {
		return err
	}
	_ = existsRes.Body.Close()

	if existsRes.StatusCode == http.StatusOK {
		pm, err := json.Marshal(map[string]any{"properties": jobIndexProperties()})
		if err != nil {
			return err
		}
		putRes, err := s.client.Indices.PutMapping(
			strings.NewReader(string(pm)),
			s.client.Indices.PutMapping.WithIndex(s.cfg.JobIndex),
			s.client.Indices.PutMapping.WithContext(ctx),
		)
		if err != nil {
			return err
		}
		defer putRes.Body.Close()
		pmb, _ := io.ReadAll(putRes.Body)
		if putRes.StatusCode >= 400 {
			return fmt.Errorf("put mapping on %s: %s: %s", s.cfg.JobIndex, putRes.Status(), string(pmb))
		}
		return nil
	}

	res, err := s.client.Indices.Create(
		s.cfg.JobIndex,
		s.client.Indices.Create.WithBody(strings.NewReader(string(b))),
		s.client.Indices.Create.WithContext(ctx),
	)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	respBytes, _ := io.ReadAll(res.Body)
	if res.StatusCode == http.StatusOK || res.StatusCode == http.StatusCreated {
		return nil
	}
	if res.StatusCode == http.StatusBadRequest &&
		strings.Contains(string(respBytes), "resource_already_exists_exception") {
		return nil
	}
	return fmt.Errorf("create index %s failed: %s: %s", s.cfg.JobIndex, res.Status(), string(respBytes))
}

// ----- HTTP utilities ----------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	body := map[string]any{
		"error": map[string]any{
			"code":    code,
			"message": message,
		},
	}
	_ = json.NewEncoder(w).Encode(body)
}
