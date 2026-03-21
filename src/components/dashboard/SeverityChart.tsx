"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { Threat } from "@/types";

interface SeverityChartProps {
  threats: Threat[];
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#FF0000",
  High: "#FF4500",
  Medium: "#FFD700",
  Low: "#00FFFF",
  Info: "#B0B0B0",
};

export default function SeverityChart({ threats }: SeverityChartProps) {
  const data = useMemo(() => {
    const counts = threats.reduce((acc, threat) => {
      acc[threat.severity] = (acc[threat.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const order = ["Critical", "High", "Medium", "Low", "Info"];
        return order.indexOf(a.name) - order.indexOf(b.name);
      });
  }, [threats]);

  if (threats.length === 0) {
    return (
      <div className="flex h-full min-h-[250px] items-center justify-center text-[var(--color-text-muted)] text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={SEVERITY_COLORS[entry.name] || "#6366f1"}
                className="transition-all hover:opacity-80 drop-shadow-lg"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
            }}
            itemStyle={{ color: "var(--color-text-primary)" }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: "0.75rem", paddingTop: "10px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
