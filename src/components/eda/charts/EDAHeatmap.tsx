"use client";

import { useState } from "react";

interface HeatmapData {
  columns: string[];
  matrix: number[][];
  hover_data?: Record<string, string>;
}

function correlationColor(value: number): string {
  // Range -1 to 1: negative → red, zero → dark, positive → cyan
  if (value > 0) {
    return `rgba(6, 182, 212, ${value.toFixed(2)})`;
  } else if (value < 0) {
    const abs = Math.abs(value);
    return `rgba(239, 68, 68, ${abs.toFixed(2)})`;
  }
  return "rgba(255,255,255,0.05)";
}

export default function EDAHeatmap({ data }: { data: HeatmapData }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  return (
    <div className="glass p-5 rounded-xl shadow-lg relative">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-primary)] mb-4">
        Correlation Heatmap
      </h4>
      <div className="overflow-auto">
        <table className="text-xs border-collapse mx-auto">
          <thead>
            <tr>
              <th className="w-8" />
              {data.columns.map((col) => (
                <th
                  key={col}
                  className="p-1 text-[var(--color-text-muted)] font-mono whitespace-nowrap max-w-[60px] overflow-hidden text-ellipsis"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 70 }}
                  title={col}
                >
                  {col.length > 8 ? col.slice(0, 8) + "…" : col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((row, i) => (
              <tr key={i}>
                <td
                  className="pr-2 text-[var(--color-text-muted)] font-mono text-right whitespace-nowrap max-w-[80px] overflow-hidden text-ellipsis"
                  title={data.columns[i]}
                >
                  {data.columns[i].length > 8 ? data.columns[i].slice(0, 8) + "…" : data.columns[i]}
                </td>
                {row.map((val, j) => {
                  const key = `${data.columns[i]}↔${data.columns[j]}`;
                  const revKey = `${data.columns[j]}↔${data.columns[i]}`;
                  const hoverText = data.hover_data?.[key] || data.hover_data?.[revKey] || `r = ${val.toFixed(3)}`;
                  return (
                    <td
                      key={j}
                      className="w-9 h-9 cursor-pointer transition-all duration-150"
                      style={{
                        backgroundColor: correlationColor(val),
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                      onMouseEnter={(e) =>
                        setTooltip({
                          x: e.clientX,
                          y: e.clientY,
                          text: `${data.columns[i]} × ${data.columns[j]}\n${hoverText}`,
                        })
                      }
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span className="flex items-center justify-center text-[9px] font-mono text-white/70">
                        {val.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded inline-block" style={{ background: "rgba(239,68,68,0.8)" }} />
          Negative
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded inline-block" style={{ background: "rgba(255,255,255,0.05)" }} />
          Neutral
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded inline-block" style={{ background: "rgba(6,182,212,0.8)" }} />
          Positive
        </span>
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-2 shadow-xl text-xs pointer-events-none whitespace-pre"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
