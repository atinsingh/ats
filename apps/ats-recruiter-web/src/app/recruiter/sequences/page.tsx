import { RecruiterShell } from '../../../components/RecruiterShell';
import { SequencesBoard } from '../../../components/sequences/SequencesBoard';
import { localDay, zonedToIso } from '../../../lib/interviews/interviews';
import { addDays, nextStep } from '../../../lib/sequences/sequences';
import {
  SAMPLE_VARS,
  representativeEnrollees,
  representativeSequence,
  representativeTemplates,
} from '../../../lib/sequences/representative';

export const dynamic = 'force-dynamic';

/** Representative firm setting until firm settings exist. */
const FIRM_TIME_ZONE = 'America/Toronto';

export default function SequencesPage() {
  // Messaging and consent records are not connected yet (IATS-173 is screens first), so the
  // sequence, people and templates are labelled representative data.
  const now = new Date();
  const today = localDay(now, FIRM_TIME_ZONE);
  const toIso = (day: string, time: string) => zonedToIso(day, time, FIRM_TIME_ZONE);
  const sequence = representativeSequence();
  const enrollees = representativeEnrollees((n) => addDays(today, -n));
  const running = { ...sequence, paused: false };
  const nextSteps = Object.fromEntries(
    enrollees.map((e) => [e.id, nextStep(running, e, now, FIRM_TIME_ZONE, toIso)]),
  );

  return (
    <RecruiterShell
      hideNewJob
      title="Sequences and templates"
      subtitle="Follow-ups that stop themselves. Agents personalise each message; you approve the first one, and your firm's consent and sending rules apply to all of them."
    >
      <SequencesBoard
        sequence={sequence}
        enrollees={enrollees}
        nextSteps={nextSteps}
        pausedLabel="Paused: nothing goes out"
        templates={representativeTemplates()}
        sampleVars={SAMPLE_VARS}
        dailyCap={60}
        timeZone={FIRM_TIME_ZONE}
        renderedAt={now.toISOString()}
        representative
      />
    </RecruiterShell>
  );
}
