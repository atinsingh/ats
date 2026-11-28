import { RecruiterShell } from '../../../components/RecruiterShell';
import { LiveReviewQueue } from '../../../components/review/LiveReviewQueue';
import { ReviewQueue } from '../../../components/review/ReviewQueue';
import { readRecruiterConfig, type RecruiterConfig } from '../../../lib/recruiter-config';
import { artifactToProposal, submittalToProposal } from '../../../lib/review/artifacts';
import type { Proposal } from '../../../lib/review/queue';
import { representativeProposals } from '../../../lib/review/representative';
import { loadSubmittalNames, recruiterClient } from '../../../lib/submittals/names';

export const dynamic = 'force-dynamic';

const QUEUE_LIMIT = 100;

/**
 * Real AI drafts and submittals waiting for approval, oldest first. Null only when neither call
 * answers, so the page falls back to samples; one failing still shows the other.
 */
async function loadLiveProposals(cfg: RecruiterConfig, baseUrl: string): Promise<Proposal[] | null> {
  const api = recruiterClient(cfg, baseUrl);
  const now = new Date();
  const [artifacts, submittals] = await Promise.allSettled([
    api.aiArtifacts.reviewQueue(QUEUE_LIMIT),
    api.submittals.list({ status: 'AWAITING_APPROVAL', limit: QUEUE_LIMIT }),
  ]);
  if (artifacts.status === 'rejected' && submittals.status === 'rejected') return null;
  const out: Proposal[] = [];
  if (artifacts.status === 'fulfilled') {
    out.push(...artifacts.value.map((a) => artifactToProposal(a, now)));
  }
  if (submittals.status === 'fulfilled' && submittals.value.length) {
    const names = await loadSubmittalNames(cfg, submittals.value);
    out.push(...submittals.value.map((s) => submittalToProposal(s, names, now)));
  }
  return out.sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

export default async function ReviewPage() {
  const cfg = readRecruiterConfig();
  const live = cfg.applicationServiceUrl
    ? await loadLiveProposals(cfg, cfg.applicationServiceUrl)
    : null;
  return (
    <RecruiterShell
      hideNewJob
      title="Review queue"
      subtitle="Nothing reaches a candidate, client or portal until you approve it."
    >
      {live && cfg.applicationServiceUrl ? (
        <LiveReviewQueue
          proposals={live}
          apiBase={cfg.applicationServiceUrl}
          tenantId={cfg.tenantId}
          userId={cfg.recruiterUserId}
        />
      ) : (
        // Messages, job posts and timesheets have no approvals service yet, so without
        // application-service the queue runs on labelled representative data.
        <ReviewQueue proposals={representativeProposals()} representative />
      )}
    </RecruiterShell>
  );
}
