import { Button } from '@jobocate/ui';

export default function AdminHome() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">Tenant operations</h2>
      <p className="mt-2 text-sm text-slate-700 sm:text-base">
        This console should be reachable only via hardened admin auth and separate OIDC client
        policies from recruiter surfaces.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button">View tenants</Button>
        <Button type="button" variant="outline">
          Incident mode
        </Button>
      </div>
    </section>
  );
}
