# Docker images

The Dockerfiles in this directory are **pattern templates** meant to be built from the **repository root** so they can see Gradle, Go modules, and pnpm workspaces.

Examples:

```bash
# Java (requires a generated Gradle wrapper in-repo)
docker build -f infra/docker/Dockerfile.java-service \
  --build-arg SERVICE_PATH=services-java/job-service \
  -t jobocate/job-service:local .

# Go
docker build -f infra/docker/Dockerfile.go-service \
  --build-arg SERVICE_PATH=services-go/search-gateway \
  --build-arg BIN=search-gateway \
  -t jobocate/search-gateway:local .

# Next.js
docker build -f infra/docker/Dockerfile.nextjs \
  --build-arg APP_PATH=apps/job-portal-web \
  -t jobocate/job-portal-web:local .
```

Local iteration should prefer `infra/docker/docker-compose.yml` for dependencies, running apps directly on the host for fast reload.
