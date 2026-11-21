package com.jobocate.core;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModule;
import org.springframework.modulith.core.ApplicationModules;

/** Fails the build when one module reaches into another module's internals (ADR-0001 §2). */
class ModularityTest {

    private static final ApplicationModules MODULES = ApplicationModules.of(InsyghtCoreApplication.class);

    @Test
    void modulesRespectTheirBoundaries() {
        MODULES.verify();
    }

    @Test
    void detectsTheModulesNamedInAdr0001() {
        assertThat(MODULES.stream().map(ApplicationModule::getIdentifier).map(Object::toString))
                .containsExactlyInAnyOrder(
                        "identity",
                        "tenancy",
                        "candidate",
                        "job",
                        "application",
                        "notification",
                        "admin",
                        "searchprojection");
    }
}
