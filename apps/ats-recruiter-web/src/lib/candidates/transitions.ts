/**
 * Moves a recruiter can make, mirroring ApplicationStatusTransitions in application-service.
 * Withdrawn and expired are left out: the candidate withdraws, and expiry is a system action.
 */
export const ALLOWED_NEXT: Record<string, string[]> = {
  APPLIED: ['SCREENING', 'SHORTLISTED', 'REJECTED'],
  SCREENING: ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW_SCHEDULED', 'OFFERED', 'REJECTED'],
  INTERVIEW_SCHEDULED: ['INTERVIEWED', 'REJECTED'],
  INTERVIEWED: ['INTERVIEW_SCHEDULED', 'SHORTLISTED', 'OFFERED', 'REJECTED'],
  OFFERED: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
  EXPIRED: [],
};
