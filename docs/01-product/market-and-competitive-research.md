# Market and competitive research — November 2026

> **Document type:** Research input to the [product outline](./prd.md).
> **Research date:** 2026-11-10. **Jira:** IATS-132.
> **How to read the evidence.** Links go to the source used. *(secondary)* means a third-party
> comparison or blog, several of them written by competitors. **[unverified]** means the claim could
> not be confirmed from a source during this research and must be checked before it is relied on.
> Capterra and Reddit were not read directly, so vendor weaknesses are mostly secondary summaries.
> Nothing here is legal advice; the regulation section needs counsel review before it drives
> commitments to customers.

## 1. Findings that change our plans

1. **Free job-board distribution is closing.** Indeed ended organic collection for single-source XML
   feeds on 31 March 2026 and ends sponsored delivery for them at the end of 2026; organic reach now
   effectively needs a direct partner integration. LinkedIn's Job Posting API and Apply with
   LinkedIn are not accepting new partners. Our Job Board Hub must lead with what needs no approval
   and reach LinkedIn through a multiposter (§4).
2. **Every incumbent now ships AI scoring and agents, and litigation has followed.** *Mobley v.
   Workday* treats the vendor as the employer's agent; *Kistler v. Eightfold* argues an applicant
   match score is a consumer report that requires disclosure and a dispute process (§5.3). A new
   scoring product has to be explainable and contestable from day one.
3. **Candidate-side "ATS score" tools and employer-side scoring do not agree with each other.** In
   one vendor's own test the same resume scored 96 in one tool and 42 in another (§3.5). No product
   we found shows candidates the same criteria-based assessment the recruiter sees. That is the
   clearest opening for a product that does matching, scoring and fixing together.
4. **A product that both rewrites and scores resumes has a specific bias risk.** LLM screeners
   prefer resumes written by the same model (§5.2). Our scorer must be shown not to reward our own
   fixer's output.
5. **Application fraud detection became standard within a year.** Greenhouse, Ashby, Gem and iCIMS
   all shipped it. It belongs in our intake design, not a later phase.
6. **Hidden text in resumes is real and mostly not "instructions".** About 1% of 196,682 real
   resumes carried hidden content, and over 90% of it was concealed skills or copied job text, which
   instruction-pattern detectors miss (§5.2).

## 2. What an ATS does: table stakes and differentiators

| Functional area | 2026 status | Where differentiation sits |
|---|---|---|
| Requisitions and approvals | Table stakes | Headcount planning tie-in |
| Job posting and distribution | Table stakes, and getting harder | Direct Indeed integration with apply and disposition sync; Google for Jobs markup; spend and source-quality analytics |
| Career site | Table stakes | Conversational apply |
| Application intake | Table stakes | Fraud, spam and identity signals |
| Resume parsing | Commodity | — |
| Screening and scoring | Table stakes | Explainability, recruiter-set criteria, published bias audits, no auto-reject |
| Pipeline and stages | Table stakes | — |
| Interview scheduling | Table stakes | Automated rescheduling |
| Interview kits and scorecards | Table stakes | AI notetaker (often a paid add-on) |
| Offers and e-signature | Table stakes | — |
| Onboarding handoff to HRIS | Table stakes | Native for the HCM suites |
| CRM and talent pools | Expected in mid-market | AI rediscovery of past applicants |
| Sourcing | Differentiator | Bundled profile data and agents |
| Referrals, mobile | Table stakes | — |
| Internal mobility | Enterprise differentiator | Skills graph |
| Analytics | Table stakes | Self-serve reporting depth |
| Compliance (EEO, GDPR) | Table stakes | AI audit logs, candidate notices, adverse-outcome workflow |
| Integrations | Table stakes | MCP servers (Greenhouse, Ashby, Pinpoint) |
| Agency features (client portal, submittals) | Agency-specific | Pay and bill |

## 3. Competitors

### 3.1 Enterprise suites

| Vendor | AI position | Notes |
|---|---|---|
| **Workday Recruiting** | Recruiting Agent (HiredScore) and Candidate Experience Agent (Paradox) ([Workday](https://blog.workday.com/en-us/workday-leads-talent-acquisition-agentic-era.html)) | Paradox acquisition closed 1 Oct 2025 ([Workday IR](https://investor.workday.com/news-and-events/press-releases/news-details/2025/Workday-Completes-Acquisition-of-Paradox-10-01-2025/default.aspx)). Reviewers call the recruiting UI dated and manual ([G2](https://www.g2.com/products/workday-recruiting/reviews)). Defendant in *Mobley*. |
| **SAP SuccessFactors + SmartRecruiters** | Winston assistant and matching ([SAP](https://community.sap.com/t5/human-capital-management-blog-posts-by-sap/1h-2026-smartrecruiters-for-sap-successfactors-connected-solutions-and-new/ba-p/14381751)) | Acquisition closed 11 Sep 2025 ([SAP](https://news.sap.com/2025/09/sap-completes-smartrecruiters-acquisition/)). Integration is still on a roadmap. |
| **Oracle Recruiting** | Applicant score, a candidate-facing match score, screening and career-coach agents ([Oracle](https://www.oracle.com/human-capital-management/ai-at-work/)) | Agent work billed in "AI Units" ([Elire](https://www.elire.com/blog/oracle-ai-world-2026-announcements)). |
| **iCIMS** | Agents, copilot, fraud detection ([iCIMS](https://www.icims.com/company/newsroom/fallrelease2026/)) | Suited to teams with dedicated operations staff *(secondary)*. |

None publishes prices.

### 3.2 Mid-market and growth

| Vendor | Pricing | AI position | Weakness |
|---|---|---|---|
| **Greenhouse** | Quote; median about $26.5k/yr *(secondary, [hrstechspace](https://www.hrstechspace.com/talent-acquisition/ashby-vs-greenhouse-vs-lever/))* | Talent Matching that never auto-rejects; Real Talent fraud and identity checks; monthly bias audits ([Greenhouse](https://www.greenhouse.com/blog/greenhouse-vs-ashby)) | Texting, fraud detection and CRM sit on higher tiers or add-ons *(secondary)* |
| **Ashby** | $400/mo up to 100 employees; AI credits metered *(secondary)* | Application review with citations, fraud detection, strong analytics | Add-on sprawl *(secondary)* |
| **Lever** (Employ) | Quote; median about $15.4k *(secondary)* | AI companions for interview, sourcing, screening | AI add-ons raise cost *(secondary)* |
| **Workable** | From $299/mo; agent credits sold separately *(secondary, [matchr](https://matchr.io/blog/top-15-ats-for-recruiters))* | Recruiting agent, AI screening | Texting, video and assessments are add-ons |
| **Teamtailor** | Quote, unlimited seats | Co-pilot evaluation against criteria ([Teamtailor](https://www.teamtailor.com/en-us/ai-recruiting-software/)) | Opaque pricing |
| **Pinpoint** | Quote, AI credits | Copilot with approval before action; explainable match score; MCP server ([Pinpoint](https://www.pinpointhq.com/insights/best-ai-applicant-tracking-system)) | No trial *(secondary)* |
| **Zoho Recruit** | $25–$50 per recruiter/mo | Matching | Needs configuration |
| **Manatal** | $15–$55 per user/mo | AI scoring; 35+ free boards ([Manatal](https://support.manatal.com/docs/enable-free-job-boards)) | Job cap on the base tier |

Greenhouse reports that its fraud checks flagged one in four candidates and one in 33 failed
identity verification ([Greenhouse](https://www.greenhouse.com/newsroom/greenhouses-real-talent-named-a-top-hr-product-of-the-year-by-hr-executive)).

### 3.3 Staffing and agency (our first market per IATS-68)

| Vendor | Pricing | Notes |
|---|---|---|
| **Bullhorn** | $99–$165 per user/mo; AI only on quote-only tiers; implementation $5k–$50k *(secondary, [recruitwithatlas](https://recruitwithatlas.com/blog/ats-pricing-comparison/))* | Amplify "digital workers" for match, screen, present, outreach ([Bullhorn](https://www.bullhorn.com/)). Dated, slow UI *(secondary)*. Owns Textkernel. |
| **Ceipal** | From $24 per user/mo | AI matching; thin outreach *(secondary)* |
| **Recruit CRM** | $95–$215 per user/mo plus credits | AI matching and agents |
| **Loxo** | $149 per user/mo and up | Natural-language search over a large profile graph |
| **Crelate** | $85–$119 per user/mo | Annual price escalator *(secondary)* |
| **Vincere** | From £95 per user | Native pay and bill |

The opening here: incumbents gate AI behind top tiers and add-ons, and their interfaces are old.

### 3.4 AI-native and agentic

| Vendor | What it is | Signal for us |
|---|---|---|
| **Eightfold** | Enterprise talent intelligence, AI interviewer, candidate agent ([Eightfold](https://eightfold.ai/company/press/press-releases/eightfold-ai-grows-talent-agents-to-2-0/)) | Defendant in *Kistler*; opaque scores are now a legal target |
| **Gem** | CRM, ATS and AI sourcing ([pricing](https://www.gem.com/pricing)) | Bundles ATS with sourcing for startups from $270/mo |
| **Juicebox, hireEZ, SeekOut, Findem** | Sourcing layers over an ATS | Natural-language search is expected ([Juicebox](https://juicebox.ai/blog/best-ai-recruiting-tools)) |
| **Metaview** | Notetaker that became an agent platform ([pricing](https://www.metaview.ai/pricing)) | Per-agent and pay-per-hire pricing |
| **LinkedIn Hiring Assistant** | Agent inside Recruiter ([LinkedIn](https://business.linkedin.com/hire/hiring-assistant)) | Boards are becoming recruiting products |
| **Indeed Talent Scout and Career Scout** | Employer agent and job-seeker agent ([Indeed](https://www.indeed.com/lead/indeed-talent-scout-futureworks-2025)) | Indeed is building both sides, as we intend to |
| **Tezi** | "Fully autonomous" recruiter | Reported as no longer sold *(secondary, **[unverified]**)*; a caution on full autonomy |

### 3.5 Candidate-side resume tools

- **Products and prices** *(mostly from [Jobscan's own roundup](https://www.jobscan.co/blog/best-ai-resume-builders/))*:
  Jobscan (about $30–$50/mo), Teal ($29/mo), Rezi ($29/mo), Resume Worded, Enhancv, Kickresume,
  Huntr.
- **What they measure.** Jobscan's match rate is keyword overlap with the job description plus
  formatting checks; it recommends 75–80% and matching word forms exactly
  ([Jobscan](https://www.jobscan.co/blog/what-jobscan-match-rate-should-i-aim-for/)). That measures
  how much of the posting was echoed back, not evidence of the skill, and it rewards stuffing.
- **Scores disagree.** One resume scored 96 on Rezi and 42 on Jobscan in Jobscan's own, vendor-biased
  test ([Jobscan](https://www.jobscan.co/blog/jobscan-vs-rezi/)). None of these tools sees the
  employer's real criteria.
- **Effect on employers.** 22% of job seekers use auto-apply bots and 28% admit to AI-faked work
  samples (Greenhouse data via [Metaview](https://www.metaview.ai/resources/blog/candidate-fraud-statistics-fake-applications)).
  Startups receive roughly 300–350 applications per hire
  ([Ashby](https://www.ashbyhq.com/talent-trends-report/reports/startup-hiring)). Only 26% of
  applicants trust AI to evaluate them fairly, and Gartner predicts one in four candidate profiles
  will be fake by 2028
  ([Gartner](https://www.gartner.com/en/newsroom/press-releases/2025-07-31-gartner-survey-shows-just-26-percent-of-job-applicants-trust-ai-will-fairly-evaluate-them)).

### 3.6 Market size

Estimates diverge; quote a range. Three sources put the global ATS market at about $2.5–3.9B in
2025 ([IMARC](https://www.imarcgroup.com/applicant-tracking-system-market),
[Straits](https://straitsresearch.com/report/applicant-tracking-system-market),
[Mordor](https://www.mordorintelligence.com/industry-reports/talent-acquisition-software-market)).
Talent-acquisition software overall is about $10–11B. One outlier
([Fortune Business Insights](https://www.fortunebusinessinsights.com/applicant-tracking-system-market-108826))
reports $17B and likely uses a wider definition.

### 3.7 Trends

- **Agents are the default pitch**, but employer AI use was flat at about 24% in 2026 *(secondary)*.
  Full autonomy is unproven.
- **Consolidation.** Workday bought HiredScore and Paradox; SAP bought SmartRecruiters; Employ holds
  Lever, JazzHR and Jobvite; Bullhorn owns Textkernel.
- **Pricing** is moving from seats to AI credits, per-agent subscriptions and pay-per-hire.
- **Job boards are squeezing free distribution** and building their own recruiter agents.

## 4. Job boards: how integration really works

| Channel | How an ATS integrates | Approval | Applies come back by | Status and constraints |
|---|---|---|---|---|
| **Google for Jobs** | schema.org `JobPosting` JSON-LD on a public page, plus the Indexing API ([Google](https://developers.google.com/search/docs/appearance/structured-data/job-posting)) | None | Candidate lands on our apply page | Free. Expired jobs must be removed; `directApply` only if apply is genuinely one step |
| **Indeed** | Job Sync API (GraphQL), Indeed Apply webhook, Disposition Sync API ([Job Sync](https://docs.indeed.com/job-sync-api/job-sync-api-guide), [Indeed Apply](https://docs.indeed.com/indeed-apply/ats), [Disposition](https://docs.indeed.com/disposition-sync-api/disposition-sync-api-guide)) | Partner programme | Signed webhook POST with the resume | XML single-source feeds lost organic collection 31 Mar 2026 ([SAP note](https://community.sap.com/t5/human-capital-management-blog-posts-by-sap/indeed-s-transition-away-from-xml-feeds-what-sap-successfactors-customers/ba-p/14326692)). Organic visibility "is not guaranteed" ([ERE](https://www.ere.net/articles/indeed-turns-up-the-heat-on-free-job-postings)). Glassdoor merged into Indeed on 1 Jul 2026, so this covers both |
| **LinkedIn** | Job Posting API, Apply Connect, Recruiter System Connect | Partner programme; Job Posting API "currently not accepting new partnerships" ([Microsoft Learn](https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview)) | Apply Connect webhooks | Realistic route today is a multiposter. Our public career pages may be picked up as limited listings |
| **ZipRecruiter** | Jobs API, Apply Webhook, Hiring Signals for disposition ([docs](https://www.ziprecruiter.com/partner/documentation/)) | Partner credentials | Signed webhook | Public partner toolkit; a good second direct connector |
| **Dice** | ATS integrations, batch posting, and a bot that reads career sites ([Dice](https://www.dice.com/support/employer-experience/integration-capabilities--instructions.html)) | Commercial | Varies | Important for our IT-staffing segment |
| **Monster / CareerBuilder** | Sold to Bold in 2025 ([Reuters](https://www.reuters.com/legal/litigation/monster-careerbuilder-job-sites-sell-28m-bankruptcy-2025-07-21/)) | **[unverified]** | **[unverified]** | Partner API status under new ownership is unknown |
| **Naukri** | Integrations exist for other ATSs ([Ashby](https://docs.ashbyhq.com/naukri)); no public developer portal | Commercial partnership | **[unverified]** | Tied to the employer's Naukri subscription |
| **SEEK / Jobstreet / Jobsdb** | One GraphQL API with OAuth and webhooks ([SEEK](https://developer.seek.com/introduction)) | Request to integrate | Application export | Relevant only if we sell in APAC |
| **Aggregators** (Jooble, Jora, Adzuna, Talent.com) | XML feed *(secondary, [jboard](https://jboard.io/blog/job-feeds))* | Light | Redirect to our apply page | Weeks, not months |
| **Multiposters** (VONQ, Broadbean, JobTarget) | One API to thousands of boards ([VONQ](https://www.vonq.com/eqo-hapi/), [Broadbean](https://integrations.broadbean.com/115004597789-Overview-of-ATS-CRM-Integration-Process.html), [JobTarget](https://www.jobtarget.com/ats-hris-partner-integration)) | Commercial contract | Via the multiposter | The only practical way to reach LinkedIn and the long tail early. Pricing is by quote |

Unified ATS APIs (Merge, Kombo) connect products to other vendors' ATSs. They do not post our jobs
to boards.

**Pay transparency drives required posting fields.** About 18 US jurisdictions require a pay range
in postings ([Trusaic](https://trusaic.com/resources/u-s-pay-transparency-laws-tracker/)), and the EU
directive's transposition deadline was 7 June 2026 with uneven adoption
([Council](https://www.consilium.europa.eu/en/policies/pay-transparency/)). Salary range, currency,
period, benefits and application deadline must be first-class job fields validated by jurisdiction.

**Scraping boards or automating recruiter sessions is not an option.** It violates board terms and
puts customer accounts at risk. This affects the federated-search epic (IATS-81) more than
distribution.

## 5. AI matching, scoring and fixing: evidence and constraints

### 5.1 How the leaders build matching

- **LinkedIn** retrieves with embeddings, then reranks the top results with a small language model;
  both stages are distilled from a large-model "relevance judge"
  ([arXiv 2602.07309](https://arxiv.org/abs/2602.07309)).
- **Indeed** uses LLM-generated, human-validated labels to train a light "bad match" classifier and
  anonymises PII before prompting
  ([RecSys '24](https://dl.acm.org/doi/fullHtml/10.1145/3640457.3688043)). It notes engagement
  signals are biased toward brand names.
- **Resume parsing.** Commercial parsers (Textkernel, Affinda, RChilli, DaXtra) cost roughly
  $0.01–$0.10 per document; their 95–99% accuracy claims have no independent benchmark
  *(secondary, [pin](https://www.pin.com/blog/best-resume-parsing-tools/))*. A 2025 paper finds LLM
  extraction strong on simple fields and weak on the hardest ones, and that having the model point
  at source spans instead of regenerating text improves both accuracy and cost
  ([arXiv 2510.09722](https://arxiv.org/abs/2510.09722)).
- **Skills taxonomies.** ESCO, O*NET and Lightcast Open Skills are open; LinkedIn's graph is not
  licensable. Sizes and licence terms here are **[unverified]** and need checking before we choose.

### 5.2 Known failure modes

- **Name-based bias.** Embedding-based resume ranking preferred white-associated names in 85% of
  tests ([UW 2024](https://arxiv.org/abs/2407.20371)).
- **Human review does not automatically fix it.** Reviewers followed a severely biased AI about 90%
  of the time
  ([UW 2025](https://www.washington.edu/news/2025/11/10/people-mirror-ai-systems-hiring-biases-study-finds/)).
  "A human is in the loop" is not sufficient; the review screen has to be designed against
  automation bias.
- **Self-preference.** LLM screeners prefer resumes written by the same LLM; candidates using the
  evaluator's model were 23–60% more likely to be shortlisted
  ([arXiv 2509.00462](https://arxiv.org/abs/2509.00462)).
- **Hidden text.** About 1% of real resumes contain hidden content, mostly concealed skills or
  copied job text ([arXiv 2605.28999](https://arxiv.org/abs/2605.28999)). The recommended defence is
  to compare extracted text with what a rendered page shows a human.

### 5.3 Regulation and litigation

Status as of November 2026. Rows without their own link come from one law-firm summary
([Gibson Dunn, Oct 2026](https://www.gibsondunn.com/artificial-intelligence-in-employment-newsletter-october-2026/)).

| Regime | Status | What it asks for |
|---|---|---|
| NYC Local Law 144 | In force since 2023 | Independent bias audit within a year before use, public summary, notice 10 business days before use |
| California civil-rights regulations | In force 1 Oct 2025 | Covers tools that facilitate decisions; vendors can be "agents"; 4-year record retention |
| California privacy (ADMT) rules | Compliance due 1 Jan 2027 | Pre-use notice, opt-out or human appeal, access to the logic |
| Colorado SB 26-189 (replaced SB 24-205) | Effective 1 Jan 2027; enforcement stayed by a federal court ([Baker Botts](https://ourtake.bakerbotts.com/post/102msga/colorado-repeals-and-replaces-ai-act)) | Names ranking and scoring; notice, adverse-outcome disclosure in 30 days, correction and meaningful human review, 3-year records, developer documentation |
| Illinois HB 3773 | In force 1 Jan 2026; notice rules withdrawn | Discriminatory effect is a violation; no ZIP code as proxy; notice of AI use |
| Texas, New Jersey, Connecticut | In force 2025–2026 | Range from intent-only (Texas) to disparate impact and notice |
| EU AI Act | High-risk employment duties deferred to 2 Dec 2027 ([EU timeline](https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act)) | As an ATS vendor we are a "provider": risk management, logging, documentation, human-oversight design. Article-level detail is **[unverified]** |
| GDPR Art. 22 and UK equivalent | In force | No solely automated significant decisions without safeguards; right to a real explanation ([Keystone](https://keystonelaw.com/keynotes/what-does-the-icos-warning-against-automated-decision-making-mean-for-ai-recruitment-and-employers/)) |
| Ontario | In force 1 Jan 2026 | Disclose AI use in public job postings ([Ogletree](https://ogletree.com/insights-resources/blog-posts/ai-in-job-postings-what-employers-in-canada-need-to-know/)) |
| India DPDP | Substantive duties from about May 2027 ([TCSA](https://www.tcsa.in/resources/dpdp-rules-2025-implementation-roadmap)) | Consent and notice; relevant to the Naukri segment |

US federal position: there is no federal statute on AI in hiring. A December 2025 executive order
set up a task force to challenge state AI laws but does not preempt them
([White House](https://www.whitehouse.gov/presidential-actions/2025/12/eliminating-state-law-obstruction-of-national-artificial-intelligence-policy/)).
Private suits and state law remain the real exposure.

Cases to watch:

- ***Mobley v. Workday*.** The vendor can be liable as the employer's agent; an age-discrimination
  collective was conditionally certified in May 2025; no liability finding yet
  ([Kress](https://kressinc.com/blog/mobley-v-workday-ai-hiring-liability-10-steps/)). The complaint
  relies on proxies such as employment gaps and graduation dates.
- ***Kistler v. Eightfold*.** Filed January 2026; argues applicant scores are consumer reports under
  the Fair Credit Reporting Act; motion to dismiss pending
  ([Akin](https://www.akingump.com/en/insights/ai-law-and-regulation-tracker/ai-hiring-platform-faces-fcra-class-action-over-data-use-or-kistler-et-al-v-eightfold-ai-inc)).
- ***Harper v. Sirius XM*.** Dismissed without prejudice in September 2026.

**Product features these rules effectively require:** jurisdiction-aware notices; a human decision
on every adverse outcome; an alternative process or accommodation path; an explanation of the
principal factors on request; candidate access to and correction of their data and scores; a
bias-audit export; an immutable decision log with model and rubric versions; retention of at least
four years; and no scoring on data the candidate did not supply.

## 6. Where we can win

1. **One assessment, visible to both sides.** The recruiter and the candidate see the same
   criteria-based evidence and gaps. Oracle, Greenhouse, Indeed and Eightfold are moving this way,
   so the window is open but not empty.
2. **Fixing that cannot fabricate.** Rewrites are bounded by facts the candidate has confirmed, with
   provenance the recruiter can see. That turns the candidate tool into a trust signal instead of
   more noise.
3. **Contestable by design.** Disclosure, explanation and correction are product workflows. This is
   the compliance answer to *Kistler* and Colorado as well as a better experience.
4. **AI included, priced plainly.** Incumbents in staffing gate AI to top tiers.
5. **Distribution that does not depend on one board.** Google for Jobs, our own marketplace, direct
   Indeed and ZipRecruiter, and a multiposter, with source-quality analytics.
6. **Staffing and in-house in one multi-tenant product**, which matches the IATS-68 decision.

## 7. Research gaps

Not established: enterprise-suite pricing; first-hand review themes; the ruling on Eightfold's
motion to dismiss; Monster/CareerBuilder and Naukri partner terms; multiposter pricing; Indeed's
sponsored-job minimums; skills-taxonomy licence terms; and EU AI Act article-level duties. The
partner-programme spike (IATS-94) and the multiposter spike (IATS-95) should close the job-board
items; counsel should review §5.3.
