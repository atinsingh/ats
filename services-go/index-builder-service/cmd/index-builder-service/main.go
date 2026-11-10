package main

import (
	"context"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/segmentio/kafka-go"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{}))
	brokers := strings.Split(getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:19092"), ",")
	topic := getenv("KAFKA_TOPIC_JOB_EVENTS", "jobocate.job.events")
	group := getenv("KAFKA_GROUP_INDEX_BUILDER", "jobocate-index-builder")

	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers: brokers,
		GroupID: group,
		Topic:   topic,
	})
	defer r.Close()

	log.Info("index_builder_started", "topic", topic, "group", group)
	for {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		m, err := r.FetchMessage(ctx)
		cancel()
		if err != nil {
			log.Warn("kafka_fetch_failed", "error", err)
			time.Sleep(time.Second)
			continue
		}
		log.Info("index_builder_event", "partition", m.Partition, "offset", m.Offset, "bytes", len(m.Value))
		if err := r.CommitMessages(context.Background(), m); err != nil {
			log.Warn("kafka_commit_failed", "error", err)
		}
	}
}

func getenv(k, def string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return def
}
