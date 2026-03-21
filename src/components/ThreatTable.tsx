"use client";

import Link from "next/link";
import type { Threat } from "@/types";

interface ThreatTableProps {
  threats: Threat[];
}

function SeverityBadge({ severity }: { severity: string }) {
  const cls = `severity-${severity.toLowerCase()}`;
  return (
    <span
      className={`${cls} inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold`}
    >
      {severity}
    </span>
  );
}

export default function ThreatTable({ threats }: ThreatTableProps) {
  if (threats.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          No Threats Found
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          Upload a security report to extract and view threats.
        </p>
        <Link href="/upload" className="btn-primary inline-block">
          Upload Report →
        </Link>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full threat-table" id="threat-table">
          <thead>
            <tr>
              <th className="px-6 py-4 text-left">Type</th>
              <th className="px-6 py-4 text-left">CVE</th>
              <th className="px-6 py-4 text-left">Severity</th>
              <th className="px-6 py-4 text-left">Affected System</th>
              <th className="px-6 py-4 text-left">Date</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="stagger-children">
            {threats.map((threat) => (
              <tr key={threat.id} className="cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {threat.type}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="text-xs bg-[var(--color-bg-input)] px-2 py-1 rounded font-mono text-[var(--color-accent-hover)]">
                    {threat.cve}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <SeverityBadge severity={threat.severity} />
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                  {threat.affected_system}
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                  {new Date(threat.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/resource/${threat.id}`}
                    className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] text-sm font-medium transition-colors"
                    id={`view-threat-${threat.id}`}
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
