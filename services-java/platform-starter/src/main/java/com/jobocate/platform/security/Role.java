package com.jobocate.platform.security;

/**
 * Canonical platform roles. Mirrors the role values stored in
 * {@code user_roles.role} and the JWT {@code roles} claim. Keep in sync
 * with {@code docs/08-security/rbac-permissions-matrix.md}.
 */
public enum Role {
    SUPER_ADMIN,
    TENANT_ADMIN,
    RECRUITER,
    HIRING_MANAGER,
    INTERVIEWER,
    CANDIDATE,
    FINANCE_ADMIN,
    COMPLIANCE_ADMIN
}
