package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/segmentio/kafka-go"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{}))
	addr := getenv("HTTP_ADDR", ":7074")
	brokers := strings.Split(getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:19092"), ",")
	topic := getenv("KAFKA_TOPIC_ANALYTICS_EVENTS", "jobocate.analytics.events")

	w := &kafka.Writer{
		Addr:         kafka.TCP(brokers...),
		Topic:        topic,
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
	}
	defer w.Close()

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("/v1/events", func(rw http.ResponseWriter, req *http.Request) {
		if req.Method != http.MethodPost {
			http.Error(rw, `{"error":"method_not_allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		var payload map[string]any
		if err := json.NewDecoder(req.Body).Decode(&payload); err != nil {
			http.Error(rw, `{"error":"invalid_json"}`, http.StatusBadRequest)
			return
		}
		payload["received_at"] = time.Now().UTC().Format(time.RFC3339Nano)
		b, _ := json.Marshal(payload)
		ctx, cancel := context.WithTimeout(req.Context(), 5*time.Second)
		defer cancel()
		if err := w.WriteMessages(ctx, kafka.Message{Value: b}); err != nil {
			log.Error("kafka_write_failed", "error", err)
			http.Error(rw, `{"error":"forward_failed"}`, http.StatusBadGateway)
			return
		}
		rw.Header().Set("Content-Type", "application/json")
		_, _ = rw.Write([]byte(`{"accepted":true}`))
	})

	srv := &http.Server{Addr: addr, Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	log.Info("http_listen", "addr", addr, "topic", topic)
	if err := srv.ListenAndServe(); err != nil {
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
