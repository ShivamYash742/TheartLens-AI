"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DistributionData {
  column: string;
  bins: string[];
  counts: number[];
  hover_data?: Record<string, string>;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  hoverData,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  hoverData?: Record<string, string>;
}) => {
  if (active && payload && payload.length) {
    const hoverText = label ? hoverData?.[label] : undefined;
    return (
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 shadow-xl max-w-[260px]">
        <p className="text-[var(--color-text-muted)] text-xs font-mono">{label}</p>
        <p className="text-[var(--color-accent)] font-semibold">{payload[0].value} records</p>
        {hoverText && (
          <p className="text-[var(--color-text-secondary)] text-xs mt-1">{hoverText}</p>
        )}
      </div>
    );
  }
  return null;
};

export default function EDADistributionChart({ chart }: { chart: DistributionData }) {
  const data = chart.bins.map((bin, i) => ({
    bin,
    count: chart.counts[i],
  }));

  return (
    <div className="glass p-5 rounded-xl shadow-lg">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-primary)] mb-4">
        Distribution — {chart.column}
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: 0, right: 8, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="bin"
            tick={{ fill: "var(--color-text-muted)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip hoverData={chart.hover_data} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
