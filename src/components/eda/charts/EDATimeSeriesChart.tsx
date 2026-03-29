"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface TimeSeriesData {
  title: string;
  timestamps: string[];
  counts: number[];
  granularity: string;
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
    return (
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 shadow-xl">
        <p className="text-[var(--color-text-muted)] text-xs font-mono">{label}</p>
        <p className="text-[var(--color-accent)] font-semibold">{payload[0].value} events</p>
        {hoverData?.peak && (
          <p className="text-[var(--color-text-secondary)] text-xs mt-1">{hoverData.peak}</p>
        )}
      </div>
    );
  }
  return null;
};

function formatTimestamp(ts: string, granularity: string): string {
  const d = new Date(ts);
  if (granularity === "hourly") {
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
  } else if (granularity === "daily") {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } else {
    return `W${d.getMonth() + 1}/${d.getDate()}`;
  }
}

export default function EDATimeSeriesChart({ chart }: { chart: TimeSeriesData }) {
  const data = chart.timestamps.map((ts, i) => ({
    time: formatTimestamp(ts, chart.granularity),
    count: chart.counts[i],
  }));

  return (
    <div className="glass p-5 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
          {chart.title}
        </h4>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)]">
          {chart.granularity}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ left: 0, right: 8, bottom: 10 }}>
          <defs>
            <linearGradient id={`grad-${chart.title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            angle={-30}
            textAnchor="end"
          />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <Tooltip content={<CustomTooltip hoverData={chart.hover_data} />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#06b6d4"
            strokeWidth={2}
            fill={`url(#grad-${chart.title})`}
            dot={false}
            activeDot={{ r: 4, fill: "#06b6d4" }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {chart.hover_data && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--color-text-secondary)]">
          {chart.hover_data.peak && <span>🔺 {chart.hover_data.peak}</span>}
          {chart.hover_data.average && <span>📊 {chart.hover_data.average}</span>}
        </div>
      )}
    </div>
  );
}
