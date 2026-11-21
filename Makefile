.PHONY: infra-up infra-down js-install js-dev java-job-service go-search-gateway py-ai-worker

infra-up:
	docker compose -f infra/docker/docker-compose.yml up -d

infra-down:
	docker compose -f infra/docker/docker-compose.yml down

js-install:
	pnpm install

js-dev:
	pnpm dev

java-job-service:
	./gradlew :services-java:job-service:bootRun --args='--server.port=8082'

go-search-gateway:
	cd services-go/search-gateway && go run ./cmd/search-gateway

py-ai-worker:
	cd workers-python/insyght-ai-worker && python -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]" && python -m insyght_ai_worker
