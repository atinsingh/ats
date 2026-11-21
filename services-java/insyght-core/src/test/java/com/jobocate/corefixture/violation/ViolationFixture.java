package com.jobocate.corefixture.violation;

import org.springframework.modulith.Modulithic;

/**
 * Root of a deliberately broken module layout used only by {@code ModularityRuleTest}. It is
 * {@code @Modulithic}, not {@code @SpringBootApplication}, so no Spring context ever loads it.
 */
@Modulithic
public final class ViolationFixture {

    private ViolationFixture() {}
}
