.PHONY: infra-up infra-down js-install js-dev java-job-service go-search-gateway py-resume-parser py-embedding-worker

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

py-resume-parser:
	cd workers-python/resume-parser-worker && python -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]" && python -m resume_parser_worker

py-embedding-worker:
	cd workers-python/embedding-worker && python -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]" && python -m embedding_worker
