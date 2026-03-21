import { fetchThreats } from "@/app/actions";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ThreatTable from "@/components/ThreatTable";
import SeverityChart from "@/components/dashboard/SeverityChart";
import RecentActivity from "@/components/dashboard/RecentActivity";
import SystemImpactMap from "@/components/dashboard/SystemImpactMap";
import KnowledgeGraph from "@/components/KnowledgeGraph";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  // Server Action
  const response = await fetchThreats();
  const threats = response.threats || [];
  const error = response.error;

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="glass max-w-md p-8 text-center border-l-4 border-[var(--color-danger)] rounded-r-lg">
          <h2 className="text-xl font-bold text-[var(--color-danger)] mb-2 uppercase tracking-wide">
            System Error
          </h2>
          <p className="text-[var(--color-text-secondary)]">Failed to load threat intelligence data.</p>
        </div>
      </div>
    );
  }

  // Dashboard overall view
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in w-full pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Command Center
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1 font-mono text-sm uppercase tracking-wider">
            Active Threat Intelligence
          </p>
        </div>
        <Link href="/upload" className="btn-primary flex items-center gap-2 px-4 py-2">
          <span>📤</span> Upload Report
        </Link>
      </div>

      {threats.length === 0 ? (
        <div className="glass-strong rounded-xl p-12 text-center border-dashed">
          <div className="text-6xl mb-4">🛡️</div>
          <h3 className="text-xl font-semibold mb-2 text-[var(--color-accent)]">
            Secure State
          </h3>
          <p className="text-[var(--color-text-secondary)] max-w-md mx-auto">
            No active threats detected. Upload a security report in the Upload center to begin processing threat intelligence.
          </p>
        </div>
      ) : (
        <>
          {/* Main Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Feature: Knowledge Graph (takes up 2 columns on lg screens) */}
            <div className="glass p-5 rounded-lg lg:col-span-2 flex flex-col min-h-[450px] shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
                <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--color-text-primary)]">
                  Intelligence Graph
                </h3>
              </div>
              <div className="flex-grow rounded-sm overflow-hidden border border-[var(--color-bg-primary)]">
                <KnowledgeGraph threats={threats} />
              </div>
            </div>

            {/* Side column: Stats & Activity */}
            <div className="flex flex-col gap-6 lg:col-span-1">
              
              <div className="glass p-5 rounded-lg shadow-lg flex-1">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--color-text-primary)] mb-4 border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
                  <span>Severity Distribution</span>
                  <span className="text-xs font-mono text-[var(--color-text-muted)]">N={threats.length}</span>
                </h3>
                <SeverityChart threats={threats} />
              </div>

              <div className="glass p-5 rounded-lg shadow-lg flex-1">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--color-text-primary)] mb-2 border-b border-[var(--color-border)] pb-2">
                  System Impact
                </h3>
                <SystemImpactMap threats={threats} />
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
            
            {/* Recent Activity List */}
            <div className="glass p-5 rounded-lg shadow-lg lg:col-span-1 flex flex-col max-h-[400px]">
               <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--color-text-primary)] mb-2 border-b border-[var(--color-border)] pb-2">
                  Recent Activity
                </h3>
                <div className="flex-grow overflow-hidden">
                  <RecentActivity threats={threats} />
                </div>
            </div>

            {/* Threat Table */}
            <div className="glass overflow-hidden rounded-lg lg:col-span-3 shadow-lg">
              <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--color-text-primary)]">
                  Threat Ledger
                </h3>
              </div>
              <div className="p-0">
                <ThreatTable threats={threats} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
