import type { Threat } from "@/types";

interface ThreatSummaryProps {
  threats: Threat[];
}

export default function ThreatSummary({ threats }: ThreatSummaryProps) {
  const total = threats.length;
  const critical = threats.filter((t) => t.severity === "Critical").length;
  const high = threats.filter((t) => t.severity === "High").length;
  const medium = threats.filter((t) => t.severity === "Medium").length;
  const low = threats.filter((t) => t.severity === "Low").length;

  const stats = [
    {
      label: "Total Threats",
      value: total,
      icon: "🎯",
      color: "var(--color-accent)",
      bgColor: "rgba(99, 102, 241, 0.1)",
    },
    {
      label: "Critical",
      value: critical,
      icon: "🔴",
      color: "var(--color-severity-critical)",
      bgColor: "rgba(239, 68, 68, 0.1)",
    },
    {
      label: "High",
      value: high,
      icon: "🟠",
      color: "var(--color-severity-high)",
      bgColor: "rgba(249, 115, 22, 0.1)",
    },
    {
      label: "Medium",
      value: medium,
      icon: "🟡",
      color: "var(--color-severity-medium)",
      bgColor: "rgba(234, 179, 8, 0.1)",
    },
    {
      label: "Low",
      value: low,
      icon: "🟢",
      color: "var(--color-severity-low)",
      bgColor: "rgba(34, 197, 94, 0.1)",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 stagger-children">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="glass rounded-xl p-4 card-hover"
          style={{ borderColor: `${stat.color}22` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
              style={{ background: stat.bgColor }}
            >
              {stat.icon}
            </div>
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: stat.color }}
          >
            {stat.value}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
