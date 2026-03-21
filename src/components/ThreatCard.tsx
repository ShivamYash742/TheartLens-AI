import Link from "next/link";
import type { Threat } from "@/types";

interface ThreatCardProps {
  threat: Threat;
}

function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return "var(--color-severity-critical)";
    case "high":
      return "var(--color-severity-high)";
    case "medium":
      return "var(--color-severity-medium)";
    case "low":
      return "var(--color-severity-low)";
    default:
      return "var(--color-severity-info)";
  }
}

export default function ThreatCard({ threat }: ThreatCardProps) {
  const severityColor = getSeverityColor(threat.severity);

  return (
    <Link href={`/resource/${threat.id}`} className="block">
      <div className="glass rounded-xl p-5 card-hover relative overflow-hidden group">
        {/* Severity indicator bar */}
        <div
          className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
          style={{ backgroundColor: severityColor }}
        />

        <div className="pl-3">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-[var(--color-text-primary)] text-sm">
                {threat.type}
              </h4>
              <code className="text-xs text-[var(--color-accent-hover)] font-mono">
                {threat.cve}
              </code>
            </div>
            <span
              className={`severity-${threat.severity.toLowerCase()} inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold`}
            >
              {threat.severity}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <span>{threat.affected_system}</span>
            <span>{new Date(threat.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Hover arrow */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-accent)]">
          →
        </div>
      </div>
    </Link>
  );
}
