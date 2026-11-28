package com.jobocate.corefixture.violation.modulea;

import com.jobocate.corefixture.violation.moduleb.internal.HiddenB;

/** Breaks the rule on purpose by depending on module B's internal type. */
public class ServiceA {

    private final HiddenB hidden = new HiddenB();

    public String call() {
        return hidden.value();
    }
}
