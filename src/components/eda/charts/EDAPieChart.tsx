"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PieChartData {
  title: string;
  labels: string[];
  values: number[];
  hover_data?: Record<string, string>;
}

const COLORS = [
  "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
  "#3b82f6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

const CustomTooltip = ({
  active,
  payload,
  hoverData,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
  hoverData?: Record<string, string>;
}) => {
  if (active && payload && payload.length) {
    const label = payload[0].name;
    const hoverText = hoverData?.[label];
    return (
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 shadow-xl max-w-[220px]">
        <p className="text-[var(--color-accent)] font-semibold text-sm">{label}</p>
        <p className="text-[var(--color-text-primary)] font-mono text-sm">
          {payload[0].value.toLocaleString()}
        </p>
        {hoverText && (
          <p className="text-[var(--color-text-secondary)] text-xs mt-1 leading-snug">{hoverText}</p>
        )}
      </div>
    );
  }
  return null;
};

export default function EDAPieChart({ chart }: { chart: PieChartData }) {
  const data = chart.labels.map((label, i) => ({
    name: label,
    value: chart.values[i],
  }));

  return (
    <div className="glass p-5 rounded-xl shadow-lg">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-primary)] mb-4">
        {chart.title}
      </h4>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip hoverData={chart.hover_data} />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
