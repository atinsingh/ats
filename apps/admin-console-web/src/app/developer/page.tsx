import type { Metadata } from 'next';
import {
  apiContracts,
  architectureGroups,
  deliveryGates,
  guardrails,
  localEndpoints,
  quickStartCommands,
  sourceDocuments,
  type DeliveryStatus,
} from '../../lib/developer-catalog';

export const metadata: Metadata = {
  title: 'Developer Hub',
  description: 'Architecture, contracts, local setup, and delivery standards for Insyght AI.',
};

const statusClasses: Readonly<Record<DeliveryStatus, string>> = {
  Available: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Scaffolded: 'border-amber-200 bg-amber-50 text-amber-800',
  Planned: 'border-slate-200 bg-slate-100 text-slate-700',
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="max-w-full overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-slate-100 shadow-sm">
      <code>{children}</code>
    </pre>
  );
}

export default function DeveloperHubPage() {
  return (
    <div className="space-y-8 pb-12 sm:space-y-10">
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-center">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">
              Insyght AI developer workspace
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Build the hiring platform from verified contracts.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Start services locally, understand ownership boundaries, and ship changes through
              security-first delivery gates.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm text-slate-300">
              <span className="rounded-md border border-slate-700 px-3 py-1.5">Multi-tenant</span>
              <span className="rounded-md border border-slate-700 px-3 py-1.5">Contract-first</span>
              <span className="rounded-md border border-slate-700 px-3 py-1.5">
                Human-reviewed AI
              </span>
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-900/80 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-white">Fast path</h3>
            <ol className="mt-4 space-y-4">
              {quickStartCommands.map((step, index) => (
                <li key={step.command} className="min-w-0">
                  <div className="mb-2 flex items-center gap-3 text-xs text-slate-400">
                    <span className="font-mono text-rose-300">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{step.label}</span>
                  </div>
                  <CodeBlock>{step.command}</CodeBlock>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section aria-labelledby="architecture-heading">
        <div className="max-w-3xl">
          <h2
            id="architecture-heading"
            className="text-2xl font-semibold tracking-tight text-slate-950"
          >
            Architecture ownership
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            PostgreSQL owns workflow state. Kafka moves domain events. OpenSearch serves derived
            search views. Every data path remains tenant-scoped.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {architectureGroups.map((group) => (
            <article
              key={group.name}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <h3 className="text-lg font-semibold text-slate-950">{group.name}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{group.purpose}</p>
              <ul className="mt-5 space-y-5">
                {group.items.map((item) => (
                  <li key={item.name} className="border-l-2 border-slate-200 pl-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-medium text-slate-900">{item.name}</h4>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs font-medium ${statusClasses[item.status]}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                    <code className="mt-2 block break-words font-mono text-xs text-rose-700">
                      {item.path}
                    </code>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="contracts-heading"
        className="grid gap-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.7fr)]"
      >
        <div className="min-w-0">
          <h2
            id="contracts-heading"
            className="text-2xl font-semibold tracking-tight text-slate-950"
          >
            API contract catalog
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            These OpenAPI files define intended interfaces. Confirm implementation status in the
            architecture audit before treating an operation as available.
          </p>
          <ul className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {apiContracts.map(([label, file]) => (
              <li key={file} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <code className="mt-1 block break-all font-mono text-xs text-rose-700">{file}</code>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-xs text-slate-500">
            packages/shared-contracts/openapi/
          </p>
        </div>

        <aside
          className="rounded-xl border border-slate-300 bg-white p-5"
          aria-labelledby="endpoints-heading"
        >
          <h3 id="endpoints-heading" className="font-semibold text-slate-950">
            Local endpoints
          </h3>
          <dl className="mt-4 space-y-4">
            {localEndpoints.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium text-slate-500">{label}</dt>
                <dd className="mt-1 break-all font-mono text-sm text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            Development tenant headers are a local-only escape hatch. They must remain disabled in
            production.
          </div>
        </aside>
      </section>

      <section aria-labelledby="guardrails-heading">
        <h2
          id="guardrails-heading"
          className="text-2xl font-semibold tracking-tight text-slate-950"
        >
          Non-negotiable guardrails
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {guardrails.map((guardrail) => (
            <article
              key={guardrail.title}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="font-semibold text-slate-950">{guardrail.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{guardrail.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="delivery-heading"
        className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white sm:p-8"
      >
        <div className="max-w-3xl">
          <h2 id="delivery-heading" className="text-2xl font-semibold tracking-tight">
            Full SDLC delivery gates
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300 sm:text-base">
            Claude Code and Cursor both use the same repository playbook. Each adapter adds
            tool-specific discovery without changing the required evidence.
          </p>
        </div>
        <ol className="mt-6 grid gap-4 md:grid-cols-5">
          {deliveryGates.map(([name, detail], index) => (
            <li key={name} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <span className="font-mono text-xs text-rose-300">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 font-semibold text-white">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 min-w-0">
          <CodeBlock>{'pnpm -r tsc --noEmit\npnpm -r build\n./gradlew test'}</CodeBlock>
        </div>
      </section>

      <section aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="text-2xl font-semibold tracking-tight text-slate-950">
          Sources of truth
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          Read the current-state audit before relying on target architecture documents.
          Code-adjacent contracts and applied migrations remain authoritative.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sourceDocuments.map(([label, path]) => (
            <li key={path} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">{label}</p>
              <code className="mt-2 block break-words font-mono text-xs text-rose-700">{path}</code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
