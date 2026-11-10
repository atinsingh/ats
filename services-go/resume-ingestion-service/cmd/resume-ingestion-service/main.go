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
	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
)

type ingestRequest struct {
	TenantID   string `json:"tenant_id"`
	CandidateID string `json:"candidate_id"`
	S3Key      string `json:"s3_key"`
	ContentType string `json:"content_type"`
}

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{}))
	addr := getenv("HTTP_ADDR", ":7072")
	brokers := strings.Split(getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:19092"), ",")
	topic := getenv("KAFKA_TOPIC_RESUME_RAW", "jobocate.resume.raw")

	kafkaWriter := &kafka.Writer{
		Addr:         kafka.TCP(brokers...),
		Topic:        topic,
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireAll,
	}
	defer kafkaWriter.Close()

	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Recoverer)

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	r.Post("/v1/resumes/ingest", func(rw http.ResponseWriter, req *http.Request) {
		var body ingestRequest
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			http.Error(rw, `{"error":"invalid_json"}`, http.StatusBadRequest)
			return
		}
		if body.TenantID == "" || body.CandidateID == "" || body.S3Key == "" {
			http.Error(rw, `{"error":"missing_fields"}`, http.StatusBadRequest)
			return
		}
		eventID := uuid.NewString()
		payload, _ := json.Marshal(map[string]any{
			"type":         "RESUME_UPLOADED",
			"event_id":     eventID,
			"tenant_id":    body.TenantID,
			"candidate_id": body.CandidateID,
			"s3_key":       body.S3Key,
			"content_type": body.ContentType,
			"occurred_at":  time.Now().UTC().Format(time.RFC3339Nano),
		})
		ctx, cancel := context.WithTimeout(req.Context(), 5*time.Second)
		defer cancel()
		if err := kafkaWriter.WriteMessages(ctx, kafka.Message{Key: []byte(body.CandidateID), Value: payload}); err != nil {
			log.Error("kafka_write_failed", "error", err)
			http.Error(rw, `{"error":"ingest_failed"}`, http.StatusBadGateway)
			return
		}
		rw.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(rw).Encode(map[string]any{"event_id": eventID})
	})

	log.Info("http_listen", "addr", addr, "topic", topic)
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
