package httpserver

import "os"

type Config struct {
	HTTPAddr           string
	OpenSearchURL      string
	InternalIndexToken string
	JobIndex           string
	IndexRefresh       string
}

func ConfigFromEnv() Config {
	addr := os.Getenv("HTTP_ADDR")
	if addr == "" {
		addr = ":7070"
	}
	osURL := os.Getenv("OPENSEARCH_URL")
	if osURL == "" {
		osURL = "http://localhost:9200"
	}
	token := os.Getenv("INTERNAL_INDEX_TOKEN")
	if token == "" {
		token = "local-dev-token"
	}
	idx := os.Getenv("JOB_SEARCH_INDEX")
	if idx == "" {
		idx = "jobocate-jobs"
	}
	// "true" = block until visible (good for tests/dev), "wait_for" = wait
	// for next refresh interval (preferred in prod), "false" = best effort.
	refresh := os.Getenv("JOB_INDEX_REFRESH")
	if refresh == "" {
		refresh = "wait_for"
	}
	return Config{
		HTTPAddr:           addr,
		OpenSearchURL:      osURL,
		InternalIndexToken: token,
		JobIndex:           idx,
		IndexRefresh:       refresh,
	}
}
