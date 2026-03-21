"use client";

import { useMemo } from "react";
import type { Threat } from "@/types";

interface RecentActivityProps {
  threats: Threat[];
}

export default function RecentActivity({ threats }: RecentActivityProps) {
  // Get top 5 most recent threats based on created_at (or just first 5 if not sorted)
  const recent = useMemo(() => {
    return [...threats]
      .sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 5);
  }, [threats]);

  if (recent.length === 0) {
    return (
      <div className="flex h-full min-h-[250px] items-center justify-center text-[var(--color-text-muted)] text-sm">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-2 stagger-children h-full min-h-[250px] overflow-y-auto pr-2">
      {recent.map((threat) => (
        <div
          key={threat.id}
          className="flex flex-col gap-1 p-3 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-bg-primary)] hover:border-[var(--color-border)] transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-[var(--color-text-primary)] truncate max-w-[70%]">
              {threat.type}
            </span>
            <span
              className={`text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded-full severity-${threat.severity.toLowerCase()}`}
            >
              {threat.severity}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <span className="truncate max-w-[50%] flex items-center gap-1">
              <span className="text-[10px]">🖥️</span> {threat.affected_system}
            </span>
            {threat.cve && threat.cve !== "N/A" && (
              <span className="font-mono text-[10px] bg-[var(--color-bg-card-hover)] px-1.5 py-0.5 rounded">
                {threat.cve}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
