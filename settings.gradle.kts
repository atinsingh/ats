rootProject.name = "jobocate-platform"

pluginManagement {
    repositories {
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()
    }
}

include(
    "services-java:platform-starter",
    "services-java:ats-core-service",
    "services-java:candidate-service",
    "services-java:job-service",
    "services-java:application-service",
    "services-java:tenant-auth-service",
    "services-java:admin-service",
    "services-java:notification-service",
    "services-java:search-orchestrator-service",
)
