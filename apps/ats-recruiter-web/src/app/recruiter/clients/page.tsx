import { RecruiterShell } from '../../../components/RecruiterShell';
import { ClientsBoard } from '../../../components/clients/ClientsBoard';
import { representativeClients } from '../../../lib/clients/representative';

export const dynamic = 'force-dynamic';

export default function ClientsPage() {
  // No client service exists yet (IATS-164 is screens first), so the list runs on labelled
  // representative data. Swap this for the service client when it lands.
  const now = new Date();
  return (
    <RecruiterShell
      hideNewJob
      title="Clients"
      subtitle="Every company you place with or are pitching. Clients that need a call come first."
    >
      <ClientsBoard clients={representativeClients(now)} now={now.toISOString()} representative />
    </RecruiterShell>
  );
}
