# Observability scaffolding

## Local stack

`infra/docker/docker-compose.yml` runs:

- **OpenTelemetry Collector** (`otel-collector`) — OTLP gRPC/HTTP in, exports traces to Jaeger and exposes a Prometheus scrape endpoint on `:8889`.
- **Jaeger** — UI at http://localhost:16686

## Java services

Run with the OpenTelemetry Java agent (recommended in production containers):

```bash
java -javaagent:/path/to/opentelemetry-javaagent.jar \
  -Dotel.exporter.otlp.endpoint=http://localhost:4317 \
  -jar job-service.jar
```

Spring Boot Actuator exposes `/actuator/prometheus` for service metrics; scrape from Prometheus in non-local environments.

## Go services

Set `OTEL_EXPORTER_OTLP_ENDPOINT` and use `go.opentelemetry.io/otel` SDK (wired in `internal/telemetry` where present). Structured logs use `log/slog` with JSON handler.

## Grafana

Add dashboard JSON under `grafana/dashboards/` as the platform matures. Example datasource provisioning lives in `terraform/` for cloud deployments.
