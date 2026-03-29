"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BarChartData {
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
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 shadow-xl max-w-[280px]">
        <p className="text-[var(--color-accent)] font-semibold text-sm">{label}</p>
        <p className="text-[var(--color-text-primary)] font-mono text-sm">
          {payload[0].value.toLocaleString()} events
        </p>
        {hoverText && (
          <p className="text-[var(--color-text-secondary)] text-xs mt-1 leading-snug">{hoverText}</p>
        )}
      </div>
    );
  }
  return null;
};

export default function EDABarChart({ chart }: { chart: BarChartData }) {
  const data = chart.labels.map((label, i) => ({
    name: label,
    value: chart.values[i],
  }));

  return (
    <div className="glass p-5 rounded-xl shadow-lg">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-primary)] mb-4">
        {chart.title}
      </h4>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip hoverData={chart.hover_data} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
