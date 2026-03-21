import Navbar from "@/components/Navbar";
import ThreatTable from "@/components/ThreatTable";
import ThreatSummary from "@/components/ThreatSummary";
import { fetchThreats } from "@/app/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";


export default async function DashboardPage() {
  const data = await fetchThreats();

  if ("error" in data && data.error) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-[var(--color-danger)]">Error loading threats: {data.error}</p>
          </div>
        </main>
      </>
    );
  }

  const threats = data.threats ?? [];
  const documents = data.documents ?? [];

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
              Threat Dashboard
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {threats.length} threat{threats.length !== 1 ? "s" : ""} detected
              across {documents.length} document
              {documents.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/upload" className="btn-primary" id="dashboard-upload-btn">
            📤 Upload Report
          </Link>
        </div>

        {/* Summary Panel */}
        <section className="mb-8" aria-label="Threat Summary">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            📈 Threat Overview
          </h2>
          <ThreatSummary threats={threats} />
        </section>

        {/* Threats Table */}
        <section aria-label="Threats List">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            🔍 All Threats
          </h2>
          <ThreatTable threats={threats} />
        </section>

        {/* Recent Documents */}
        {documents.length > 0 && (
          <section className="mt-8" aria-label="Recent Documents">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              📁 Recent Documents
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
              {documents.slice(0, 6).map((doc) => (
                <div key={doc.id} className="glass rounded-xl p-4 card-hover">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[rgba(99,102,241,0.1)] flex items-center justify-center text-lg shrink-0">
                      📄
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {doc.filename}
                      </h4>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
