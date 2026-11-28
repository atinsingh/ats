// insyght-core: the Java backend as one Spring Modulith application (ADR-0001, IATS-135).
plugins {
    java
    alias(libs.plugins.spring.boot)
    alias(libs.plugins.dependency.management)
}

group = "com.jobocate"
version = "0.1.0-SNAPSHOT"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

dependencyManagement {
    imports {
        // Importing a BOM here replaces the one the Spring Boot plugin adds, so import it first.
        mavenBom(org.springframework.boot.gradle.plugin.SpringBootPlugin.BOM_COORDINATES)
        // Spring Modulith 2.0.x is the line built for Spring Boot 4.0. Apache License 2.0.
        mavenBom("org.springframework.modulith:spring-modulith-bom:${libs.versions.spring.modulith.get()}")
    }
}

dependencies {
    implementation(project(":services-java:platform-starter"))
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.modulith:spring-modulith-starter-core")
    implementation("org.postgresql:postgresql")
    implementation("io.micrometer:micrometer-registry-prometheus")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.modulith:spring-modulith-starter-test")
    // Testcontainers 2.x, versioned by the Spring Boot 4 BOM. The 1.20 catalog entries would mix 1.x and 2.x jars.
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
