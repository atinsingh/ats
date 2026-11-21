# insyght-core

The Java backend as one Spring Modulith application ([ADR-0001](../../docs/02-architecture/adr/ADR-0001-modular-monolith.md)).
Each package directly under `com.jobocate.core` is a module. Its top-level package is the module's API, and its
subpackages are internal.

```bash
docker compose -f infra/docker/docker-compose.yml up -d postgres
SPRING_PROFILES_ACTIVE=local ./gradlew :services-java:insyght-core:bootRun   # http://localhost:8080/actuator/health
./gradlew :services-java:insyght-core:build          # includes ModularityTest
```

`ModularityTest` runs `ApplicationModules.verify()` and fails the build when a module uses another module's internal
types or creates a dependency cycle. To expose something to other modules, put it in the module's top-level package
or a named interface (`@NamedInterface`).

Outside the `local` profile the app needs `JOBOCATE_JWT_SECRET` and `JOBOCATE_INTERNAL_TOKEN` and will not start
without them. Only `/actuator/health` is public. Other actuator endpoints, including `/actuator/prometheus`, need a SUPER_ADMIN
token (the internal token only works on `/internal/**`).

The modules are empty until IATS-136 to IATS-142 move each service in.
