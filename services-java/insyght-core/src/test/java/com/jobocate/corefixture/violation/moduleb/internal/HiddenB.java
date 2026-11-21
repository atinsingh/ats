package com.jobocate.corefixture.violation.moduleb.internal;

/** Internal to module B: other modules must not use it. */
public class HiddenB {

    public String value() {
        return "hidden";
    }
}
