import Navbar from "@/components/Navbar";
import { fetchThreatById, deleteThreat } from "@/app/actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";


export default async function ResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchThreatById(id);

  if ("error" in data && data.error) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="glass rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
              Threat Not Found
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              {data.error}
            </p>
            <Link href="/dashboard" className="btn-primary">
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </>
    );
  }

  const { threat, document } = data;

  function getSeverityClass(severity: string) {
    return `severity-${severity.toLowerCase()}`;
  }

  async function handleDelete() {
    "use server";
    const formData = new FormData();
    formData.set("id", id);
    await deleteThreat(formData);
    redirect("/dashboard");
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6 animate-fade-in">
          <Link
            href="/dashboard"
            className="hover:text-[var(--color-accent)] transition-colors"
          >
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-[var(--color-text-secondary)]">
            Threat Detail
          </span>
        </nav>

        <div className="space-y-6 animate-fade-in">
          {/* Header Card */}
          <div className="glass rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[rgba(99,102,241,0.1)] flex items-center justify-center text-2xl">
                  🛡️
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                    {threat!.type}
                  </h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className={`${getSeverityClass(threat!.severity)} inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold`}
                    >
                      {threat!.severity}
                    </span>
                    <code className="text-xs bg-[var(--color-bg-input)] px-2 py-1 rounded font-mono text-[var(--color-accent-hover)]">
                      {threat!.cve}
                    </code>
                  </div>
                </div>
              </div>

              <form action={handleDelete}>
                <button type="submit" className="btn-danger text-sm" id="delete-threat-btn">
                  🗑️ Delete Threat
                </button>
              </form>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Threat Details */}
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                📋 Threat Details
              </h2>
              <dl className="space-y-4">
                {[
                  { label: "Threat Type", value: threat!.type },
                  { label: "CVE Identifier", value: threat!.cve },
                  { label: "Severity Level", value: threat!.severity },
                  { label: "Affected System", value: threat!.affected_system },
                  {
                    label: "Detected On",
                    value: new Date(threat!.created_at).toLocaleString(),
                  },
                  { label: "Threat ID", value: threat!.id },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col">
                    <dt className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                      {item.label}
                    </dt>
                    <dd className="text-sm text-[var(--color-text-primary)] font-medium mt-0.5 break-all">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Source Document */}
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                📄 Source Document
              </h2>
              {document ? (
                <dl className="space-y-4">
                  <div className="flex flex-col">
                    <dt className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                      Filename
                    </dt>
                    <dd className="text-sm text-[var(--color-text-primary)] font-medium mt-0.5">
                      {document.filename}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                      Uploaded On
                    </dt>
                    <dd className="text-sm text-[var(--color-text-primary)] font-medium mt-0.5">
                      {new Date(document.created_at).toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                      Content Preview
                    </dt>
                    <dd className="text-xs text-[var(--color-text-secondary)] font-mono mt-1 p-3 bg-[var(--color-bg-input)] rounded-lg max-h-48 overflow-auto">
                      {document.content?.substring(0, 500)}
                      {(document.content?.length ?? 0) > 500 && "..."}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Source document not found.
                </p>
              )}
            </div>
          </div>

          {/* Back button */}
          <div>
            <Link
              href="/dashboard"
              className="btn-secondary inline-flex items-center gap-2"
              id="back-to-dashboard"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
