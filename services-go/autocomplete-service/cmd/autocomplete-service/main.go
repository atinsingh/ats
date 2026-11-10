package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/redis/go-redis/v9"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{}))

	addr := getenv("HTTP_ADDR", ":7071")
	redisURL := getenv("REDIS_URL", "redis://localhost:6379")
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Error("redis_url_parse_failed", "error", err)
		os.Exit(1)
	}
	rdb := redis.NewClient(opts)

	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Recoverer)

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := rdb.Ping(ctx).Err(); err != nil {
			http.Error(w, `{"status":"degraded"}`, http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	r.Get("/v1/autocomplete/jobs", func(w http.ResponseWriter, req *http.Request) {
		tenant := strings.TrimSpace(req.Header.Get("X-Jobocate-Tenant-Id"))
		if tenant == "" {
			http.Error(w, `{"error":"missing_tenant"}`, http.StatusUnauthorized)
			return
		}
		q := strings.TrimSpace(req.URL.Query().Get("q"))
		if q == "" {
			_ = json.NewEncoder(w).Encode(map[string]any{"suggestions": []string{}})
			return
		}
		ctx, cancel := context.WithTimeout(req.Context(), 500*time.Millisecond)
		defer cancel()
		key := "ac:jobs:" + tenant + ":" + strings.ToLower(q)
		members, err := rdb.ZRange(ctx, key, 0, 9).Result()
		if err != nil {
			log.Warn("autocomplete_redis_failed", "error", err)
			http.Error(w, `{"error":"cache_unavailable"}`, http.StatusBadGateway)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"suggestions": members})
	})

	log.Info("http_listen", "addr", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Error("server_stopped", "error", err)
		os.Exit(1)
	}
}

func getenv(k, def string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return def
}
