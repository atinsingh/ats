package com.jobocate.core;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jobocate.corefixture.violation.ViolationFixture;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.core.Violations;

/**
 * Proves the boundary check actually bites: a fixture where module A uses a class from module B's
 * internal package must fail {@code verify()}.
 */
class ModularityRuleTest {

    // The fixture lives in test sources, which ApplicationModules.of(...) skips by default.
    private static final ImportOption INCLUDE_TEST_CLASSES = location -> true;

    @Test
    void verifyFailsWhenAModuleUsesAnotherModulesInternals() {
        ApplicationModules fixture = ApplicationModules.of(ViolationFixture.class, INCLUDE_TEST_CLASSES);

        assertThatThrownBy(fixture::verify)
                .isInstanceOf(Violations.class)
                .hasMessageContaining("moduleb.internal.HiddenB");
    }
}
