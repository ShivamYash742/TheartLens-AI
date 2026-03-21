"use client";

import { useMemo } from "react";
import type { Threat } from "@/types";

interface SystemImpactMapProps {
  threats: Threat[];
}

export default function SystemImpactMap({ threats }: SystemImpactMapProps) {
  const topSystems = useMemo(() => {
    const counts: Record<string, { total: number; critical: number; high: number }> = {};

    threats.forEach((t) => {
      const system = t.affected_system || "Unknown";
      if (!counts[system]) {
        counts[system] = { total: 0, critical: 0, high: 0 };
      }
      counts[system].total++;
      if (t.severity === "Critical") counts[system].critical++;
      if (t.severity === "High") counts[system].high++;
    });

    return Object.entries(counts)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // Top 5
  }, [threats]);

  if (topSystems.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-[var(--color-text-muted)] text-sm">
        No system data available
      </div>
    );
  }

  // Find max total to calculate bar widths
  const maxTotal = Math.max(...topSystems.map((s) => s.total));

  return (
    <div className="flex flex-col justify-center h-[250px] space-y-4">
      {topSystems.map((system) => {
        const widthPercent = Math.max(10, (system.total / maxTotal) * 100);
        
        // Decide bar color based on highest severity presence
        let barColorClass = "bg-[var(--color-severity-info)]";
        if (system.critical > 0) barColorClass = "bg-[var(--color-severity-critical)]";
        else if (system.high > 0) barColorClass = "bg-[var(--color-severity-high)]";
        else if (system.total > 0) barColorClass = "bg-[var(--color-severity-medium)]";

        return (
          <div key={system.name} className="flex flex-col gap-1.5 group">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--color-text-primary)] truncate max-w-[80%] uppercase tracking-wider">
                {system.name}
              </span>
              <span className="text-[var(--color-text-secondary)] font-mono">
                {system.total}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[var(--color-bg-primary)] rounded-full overflow-hidden">
              <div
                className={`h-full ${barColorClass} transition-all duration-1000 ease-out group-hover:brightness-125 glow-accent`}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
