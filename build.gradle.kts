// Aggregate Java workspace. Run individual services with:
//   ./gradlew :services-java:job-service:bootRun

tasks.register("javaServices") {
    group = "verification"
    description = "Lists Java service projects"
    doLast {
        subprojects.forEach { println(it.path) }
    }
}
