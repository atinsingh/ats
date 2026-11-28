# Product outline — InsyghtATS

> **Document type:** Product requirements outline: positioning, users, pillars, scope, metrics.
> **Status:** Draft for product-owner review. **Jira:** IATS-132.
> **Inputs:** [`market-and-competitive-research.md`](./market-and-competitive-research.md),
> [`../02-architecture/as-is-verification-2026-11.md`](../02-architecture/as-is-verification-2026-11.md),
> the IATS backlog (epics E01–E20) and the product-boundary recommendation in IATS-68.
> **Relationship to other docs:** [`functional-requirements.md`](./functional-requirements.md) stays
> authoritative for module-level behaviour. This outline sets direction and adds what that document
> and the backlog are missing.

## 1. Product in one paragraph

InsyghtATS is a multi-tenant applicant tracking system for staffing agencies and in-house hiring
teams in which every candidate is assessed against the job's stated requirements, with evidence, and
the candidate can see and improve that same assessment. It publishes jobs to the boards that matter
from one place and brings every application back into one pipeline. AI ranks, explains and drafts;
people decide.

## 2. Who it is for

| Segment | Order | Why |
|---|---|---|
| Staffing agencies and IT recruiting teams | First | Most multi-board pain (Dice, Monster, Naukri), incumbents with dated interfaces and AI gated to top tiers. Matches IATS-68. |
| In-house talent teams, 50–2,000 employees | Second | Same product with requisition approvals switched on. Greenhouse and Ashby are strong here, so we enter after the assessment is proven. |
| Job seekers | Alongside both | They use the candidate tools and supply the talent network. They do not pay at launch. |

Personas are those in [`functional-requirements.md` §1](./functional-requirements.md). Two get
sharper definitions:

- **Recruiter (agency).** Works 15–40 open roles across several clients. Measured on submittals and
  placements. Wants a ranked, defensible shortlist within minutes of opening a role, and one place
  to post and receive applications.
- **Candidate.** Applies to many roles with little feedback. Wants to know why they do or do not fit
  and what to change, without being asked to exaggerate.

## 3. Positioning

**For recruiters:** a shortlist you can defend. Every score breaks down by requirement and points at
the lines in the resume that support it.

**For candidates:** the same assessment the recruiter sees, plus help closing real gaps truthfully.

**Against incumbents:**

| Competitor type | Their weakness | Our answer |
|---|---|---|
| Bullhorn, Ceipal, JobDiva | Old interfaces; AI on premium tiers | AI included; keyboard-first workspace |
| Greenhouse, Ashby, Lever | Candidate sees nothing; AI metered as add-ons | Shared assessment; plain pricing |
| Eightfold, Workday | Opaque scores now under litigation | Evidence-cited, contestable scores |
| Jobscan, Teal, Rezi | Guess at the employer's criteria; reward keyword stuffing | Uses the employer's real criteria; cannot add unconfirmed facts |

## 4. The four pillars

Each pillar links to its design. Requirement IDs use the prefix `PR-` so they can be referenced in
stories.

### 4.1 Matching engine

Rank candidates for a job, and jobs for a candidate, from the same assessment.

- **PR-M1** Recruiters define criteria per job: must-have, nice-to-have and weights, drafted by AI
  from the job description and approved by a person. *(IATS-32)*
- **PR-M2** Ranking uses hybrid retrieval then a reranker, and returns a per-requirement breakdown
  with cited resume text. *(IATS-31, IATS-108)*
- **PR-M3** Must-have gaps are shown as "not found — confirm with candidate". The system never
  rejects, advances or contacts a candidate by itself. *(IATS-34)*
- **PR-M4** The evaluation view excludes name, photo, address, age and graduation-year signals, and
  never scores employment gaps or tenure patterns.
- **PR-M5** Past applicants and talent-pool members are matched to new jobs automatically
  ("rediscovery"). *(IATS-39)*
- **PR-M6** Candidates see a ranked list of jobs with the same breakdown. *(new)*

### 4.2 Resume scoring

Replace the single "ATS score" with an evidence rubric.

- **PR-S1** A resume is scored against a specific job on six dimensions: requirement coverage,
  evidence strength, recency, seniority fit, quantified impact and parseability.
- **PR-S2** Each dimension shows its score, the reason and the cited text. A single headline number
  is shown only alongside the breakdown.
- **PR-S3** The candidate can score a resume before applying, against the employer's real criteria
  where the employer allows it, otherwise against criteria derived from the public posting. *(new)*
- **PR-S4** A general resume health check exists for candidates with no target job. *(new)*
- **PR-S5** Every score records model, prompt, rubric and taxonomy versions and is reproducible for
  audit. *(IATS-62)*
- **PR-S6** Candidates can see their score, ask for an explanation and report wrong evidence; the
  correction is audited and applied on the next run. *(IATS-33, IATS-64)*

### 4.3 Resume fixing

Help the candidate present what is true, better.

- **PR-F1** Suggestions are generated only from the candidate's confirmed fact record. Every
  rewritten line traces to source facts.
- **PR-F2** A missing requirement becomes a question ("Have you used Kafka? Where?"). It is added
  only after the candidate answers, and is marked as candidate-attested.
- **PR-F3** The candidate reviews a line-by-line diff, accepts or edits each change, and attests to
  accuracy before a variant can be used in an application. *(existing artifact review gate)*
- **PR-F4** Formatting and parseability fixes are offered separately from content changes.
- **PR-F5** The recruiter sees that a variant was AI-assisted and can open the original.
- **PR-F6** The scorer is tested on every release to confirm it does not favour our fixer's output
  over an equivalent human-written resume. *(new, IATS-61)*
- **PR-F7** No auto-apply to third-party sites.
  ([`portal-parity-roadmap.md`](../18-roadmap/portal-parity-roadmap.md) already excludes it.)

### 4.4 Job Board Hub

Publish once, receive everywhere, know what worked.

- **PR-J1** Every published job has a public page with Google for Jobs markup and is removed from
  the index when it closes. *(IATS-121)*
- **PR-J2** Each tenant has a public jobs feed (JSON and XML) for aggregators and boards that pull.
- **PR-J3** Direct connectors for Indeed (jobs, apply, screener questions, disposition sync) and
  ZipRecruiter. *(IATS-87; ZipRecruiter moves up from IATS-93)*
- **PR-J4** A multiposter covers LinkedIn and long-tail boards. *(IATS-90, IATS-95)*
- **PR-J5** Applications from every channel land in one pipeline with a source, de-duplicated per
  tenant. *(IATS-91)*
- **PR-J6** Jobs are validated before posting against each channel's required fields and the pay
  transparency rules of the job's location. *(new)*
- **PR-J7** Reporting shows applications, qualified applications, cost and hires by channel.
  *(IATS-92)*

## 5. Supporting capabilities

These already exist in the backlog and are needed before or alongside the pillars.

| Capability | Backlog | Note |
|---|---|---|
| Real authentication and role enforcement | E02 | Blocks everything; see as-is §3.1 |
| Requisitions, careers site | E03 | |
| Pipeline, stages, notes, bulk actions | E08 | Tables exist, endpoints do not |
| Candidate profile and index | E04 | Needed for matching |
| AI gateway, embeddings, parsing | E17 | Foundation for §4.1–4.3 |
| Responsible AI controls | E13 | Notices, audit, rights requests |
| Interviews, offers | E09, E10 | After the pillars are usable |
| Recruiter workspace and design system | E18 | |
| Talent network and marketplace | E19 | Carries the candidate tools |

## 6. Gaps in the current backlog

Found by comparing the backlog with the research and the user's four stated priorities.

| # | Gap | Recommendation |
|---|---|---|
| 1 | **No story for candidate-facing resume scoring or fixing.** E19 mentions a "candidate copilot" only as a phase-3 item. Two of the four priorities have no stories. | Add an epic "Candidate resume intelligence" with stories for PR-S3, PR-S4, PR-F1–F6 |
| 2 | **No application fraud or hidden-text handling.** | Add stories under E08: hidden-text detection, duplicate and velocity signals, shown to recruiters as flags |
| 3 | **Self-preference test missing** from the evaluation plan. | Add to IATS-61 and IATS-75 |
| 4 | **Automation-bias safeguards** in the review screen are not specified. | Add acceptance criteria to IATS-34: evidence before score, override reasons, sampled audits |
| 5 | **Pay-transparency validation** is not in any job or posting story. | Add to IATS-24 and IATS-85 |
| 6 | **First-wave job boards assume routes that are closed or slow.** LinkedIn is not taking new posting partners; Indeed needs partner onboarding. | Re-order E15: Google for Jobs and public feeds first, Indeed and ZipRecruiter partner onboarding started now, LinkedIn via the multiposter |
| 7 | **Federated search across board resume databases** (IATS-100, IATS-102) depends on licensed access that boards rarely grant to an ATS. | Keep IATS-98 (search strings a recruiter runs themselves) as the first deliverable; treat federated search as contingent on IATS-94 |
| 8 | **Disposition sync to boards** is implied but not a story. Indeed treats it as expected. | Add a story under E15 |
| 9 | **Candidate access to their own score** is not explicit in IATS-64. | Add to IATS-64 |
| 10 | **Known code defects** block the pillars. | File bugs from as-is §3 before feature work |

## 7. Principles

1. **AI ranks, explains and drafts. People decide.** No AI-initiated reject, advance or contact.
2. **Evidence or no claim.** Every score and suggestion cites its source.
3. **Same truth for both sides.** The candidate can see what the recruiter sees about fit.
4. **Only data the candidate supplied.** No scraped enrichment in scoring.
5. **Tenant isolation everywhere**, including vectors, caches, prompts and connector credentials.
6. **Contestable.** Notice, explanation, correction and human review are product features.

## 8. Phases

Each phase ends with something a design partner can use.

| Phase | Outcome | Contents |
|---|---|---|
| **0. Trust and plumbing** | The existing flows work for real users | Authentication and roles; fix the contract and data defects in the as-is assessment; install CI |
| **1. Assessment core** | A recruiter opens a job and gets an evidence-cited ranked list of applicants | AI gateway; real parsing into a fact record; job skills and criteria; candidate index; scoring rubric; evaluation set and fairness gates; review screen |
| **2. Distribution** | One job reaches Google, aggregators, Indeed and the multiposter, and applications return with a source | Integration hub; public pages and feeds; Indeed and ZipRecruiter; multiposter; channel reporting. Can run in parallel with phase 1 |
| **3. Candidate side** | A candidate scores and fixes a resume against a real job and applies with the approved variant | Candidate score view; fact-bounded fixer; job matches for candidates; notices and rights workflows |
| **4. Depth** | A full hiring cycle runs in the product | Interviews, offers, CRM and rediscovery, analytics, recruiter agent |

## 9. Success measures

| Measure | Target for the pilot |
|---|---|
| Ranking quality (NDCG@10 on the labelled set) | Agreed threshold set in IATS-75 before launch |
| Recruiter agreement with top-10 ranking | ≥ 70% of AI top-10 judged "worth a screen" |
| Time from job open to first shortlist | Under 15 minutes for a job with 100+ applicants |
| Adverse-impact ratio by group, per release and per tenant | ≥ 0.80, with any breach blocking release |
| Self-preference gap (fixer output vs human equivalent) | Not statistically different |
| Fixer suggestions accepted without edit | ≥ 50% |
| Fabrication rate in fixer output (lines with no source fact) | 0 in release testing |
| Applications with a known source | ≥ 98% |
| Share of hires from owned and free channels | Baseline in pilot; E19 targets ≥ 40% long term |

The numeric targets are proposals. They need product-owner agreement and, for the fairness
thresholds, counsel review.

## 10. Pricing direction

A proposal to test with design partners, not a decision:

- Per-recruiter seat with AI assessment included, because competitors gate it.
- Usage limits on heavy AI actions for cost control, shown plainly.
- Job-board spend passed through at cost; the multiposter fee structure depends on IATS-95.
- Candidate tools free.

## 11. Decisions needed from the product owner

1. Confirm staffing agencies as the first segment (IATS-68 is still open).
2. May employers expose their real criteria to candidates before applying (PR-S3), or only after?
3. Is the candidate side in the first commercial release or the second?
4. `Jobocate` or `Insyght` as the code-level name, before new services are created.
5. Which jurisdictions the pilot will operate in, which sets the notice and audit scope.
6. Approve creating the missing epic and stories in §6.

## 12. Out of scope

Auto-apply to third-party sites; scraping job boards or profiles; video or voice analysis of
candidates; emotion or personality inference; fully autonomous agents that act on candidates
without approval; payroll and pay-and-bill.
