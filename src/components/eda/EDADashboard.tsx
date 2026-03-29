"use client";

import { useState, useCallback, useRef } from "react";
import EDABarChart from "./charts/EDABarChart";
import EDAPieChart from "./charts/EDAPieChart";
import EDATimeSeriesChart from "./charts/EDATimeSeriesChart";
import EDAHeatmap from "./charts/EDAHeatmap";
import EDADistributionChart from "./charts/EDADistributionChart";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";

// ─────────────────────────────────────────
// Types (matching backend EDAResult schema)
// ─────────────────────────────────────────

interface ColumnStat {
  column_name: string;
  dtype: string;
  unique_count: number;
  missing_count: number;
  missing_percentage: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  median?: number;
}

interface BasicStats {
  row_count: number;
  column_count: number;
  columns: ColumnStat[];
  memory_usage_mb: number;
}

interface TopEntity {
  name: string;
  count: number;
}

interface TopEntities {
  top_ips?: TopEntity[];
  top_event_types?: TopEntity[];
  top_error_sources?: TopEntity[];
  top_users?: TopEntity[];
}

interface EDAResult {
  id: string;
  filename: string;
  status: "pending" | "processing" | "completed" | "failed";
  stats?: BasicStats;
  heatmap?: { columns: string[]; matrix: number[][]; hover_data?: Record<string, string> };
  bar_charts?: { title: string; labels: string[]; values: number[]; hover_data?: Record<string, string> }[];
  pie_charts?: { title: string; labels: string[]; values: number[]; hover_data?: Record<string, string> }[];
  timeseries?: { title: string; timestamps: string[]; counts: number[]; granularity: string; hover_data?: Record<string, string> }[];
  top_entities?: TopEntities;
  distributions?: { column: string; bins: string[]; counts: number[]; hover_data?: Record<string, string> }[];
  ai_summary?: string;
  errors?: string[];
}

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass p-4 rounded-xl text-center">
      <p className="text-2xl font-bold text-[var(--color-accent)] font-mono">{value}</p>
      <p className="text-xs uppercase tracking-wider text-[var(--color-text-primary)] mt-1">{label}</p>
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

function TopEntityList({ title, entities }: { title: string; entities: TopEntity[] }) {
  return (
    <div className="glass p-4 rounded-xl">
      <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)] mb-3">{title}</h5>
      <ul className="space-y-1.5">
        {entities.slice(0, 6).map((e, i) => (
          <li key={i} className="flex items-center justify-between">
            <span className="text-xs font-mono text-[var(--color-text-secondary)] truncate max-w-[150px]" title={e.name}>
              {e.name}
            </span>
            <span className="text-xs font-semibold text-[var(--color-accent)] ml-2 shrink-0">
              {e.count.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────
// Main EDA Dashboard Component
// ─────────────────────────────────────────

type UploadState = "idle" | "uploading" | "polling" | "done" | "error";

export default function EDADashboard() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<EDAResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for result
  const startPolling = useCallback((jobId: string) => {
    setUploadState("polling");
    setStatusMsg("Processing… crunching your data 🔬");

    pollRef.current = setInterval(async () => {
      try {
        const statusRes = await fetch(`${BACKEND_URL}/eda/status/${jobId}`);
        const statusData = await statusRes.json();

        if (statusData.status === "completed") {
          clearInterval(pollRef.current!);
          const resultRes = await fetch(`${BACKEND_URL}/eda/result/${jobId}`);
          const eda: EDAResult = await resultRes.json();
          setResult(eda);
          setUploadState("done");
          setStatusMsg("");
        } else if (statusData.status === "failed") {
          clearInterval(pollRef.current!);
          const resultRes = await fetch(`${BACKEND_URL}/eda/result/${jobId}`);
          const eda: EDAResult = await resultRes.json();
          setErrorMsg(eda.errors?.join(", ") || "Processing failed");
          setUploadState("error");
        }
      } catch {
        clearInterval(pollRef.current!);
        setErrorMsg("Lost connection to backend");
        setUploadState("error");
      }
    }, 1500);
  }, []);

  // Upload handler
  const handleUpload = useCallback(async (file: File) => {
    if (!file.name.match(/\.(csv|json)$/i)) {
      setErrorMsg("Only .csv and .json files are supported");
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    setStatusMsg(`Uploading ${file.name}…`);
    setResult(null);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/eda/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data = await res.json();
      startPolling(data.id);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Upload failed");
      setUploadState("error");
    }
  }, [startPolling]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setUploadState("idle");
    setResult(null);
    setErrorMsg("");
    setStatusMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ──── Render ────

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">EDA Analytics</h1>
          <p className="text-[var(--color-text-secondary)] mt-1 font-mono text-sm uppercase tracking-wider">
            Upload a CSV or JSON file to explore your data
          </p>
        </div>
        {result && (
          <button onClick={reset} className="btn-primary px-4 py-2 text-sm">
            ↩ New Upload
          </button>
        )}
      </div>

      {/* Upload Zone */}
      {uploadState === "idle" && (
        <div
          className={`glass border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
            dragging ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5" : "border-[var(--color-border)]"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="text-5xl mb-4">📂</div>
          <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
            Drop your file here
          </h3>
          <p className="text-[var(--color-text-secondary)] text-sm mb-4">
            Supports <span className="font-mono text-[var(--color-accent)]">.csv</span> and{" "}
            <span className="font-mono text-[var(--color-accent)]">.json</span> log files
          </p>
          <button className="btn-primary px-6 py-2 text-sm pointer-events-none">Browse files</button>
          <input ref={fileInputRef} type="file" accept=".csv,.json" className="hidden" onChange={onFileChange} />
        </div>
      )}

      {/* Processing State */}
      {(uploadState === "uploading" || uploadState === "polling") && (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-[var(--color-accent)] border-t-transparent animate-spin" />
          <p className="text-[var(--color-text-primary)] font-semibold text-lg">{statusMsg}</p>
          <p className="text-[var(--color-text-muted)] text-sm mt-2">
            The backend is running EDA — this usually takes 1–3 seconds
          </p>
        </div>
      )}

      {/* Error State */}
      {uploadState === "error" && (
        <div className="glass rounded-2xl p-8 text-center border-l-4 border-[var(--color-danger)]">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-[var(--color-danger)] mb-2">Processing Failed</h3>
          <p className="text-[var(--color-text-secondary)] text-sm mb-6">{errorMsg}</p>
          <button onClick={reset} className="btn-primary px-6 py-2 text-sm">Try Again</button>
        </div>
      )}

      {/* ─── Results ─── */}
      {result && result.status === "completed" && (
        <div className="space-y-8">
          {/* AI Summary */}
          {result.ai_summary && (
            <div className="glass p-5 rounded-xl border-l-4 border-[var(--color-accent)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)] mb-2">
                🤖 AI Summary
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{result.ai_summary}</p>
            </div>
          )}

          {/* Stats Row */}
          {result.stats && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                Dataset Overview
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Rows" value={result.stats.row_count.toLocaleString()} />
                <StatCard label="Columns" value={result.stats.column_count} />
                <StatCard label="File" value={result.filename} />
                <StatCard label="Memory" value={`${result.stats.memory_usage_mb.toFixed(2)} MB`} />
              </div>
            </div>
          )}

          {/* Top Entities */}
          {result.top_entities && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                Top Entities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {result.top_entities.top_ips && (
                  <TopEntityList title="🌐 Top IPs" entities={result.top_entities.top_ips} />
                )}
                {result.top_entities.top_event_types && (
                  <TopEntityList title="🏷️ Event Types" entities={result.top_entities.top_event_types} />
                )}
                {result.top_entities.top_error_sources && (
                  <TopEntityList title="⚠️ Severity" entities={result.top_entities.top_error_sources} />
                )}
                {result.top_entities.top_users && (
                  <TopEntityList title="👤 Top Users" entities={result.top_entities.top_users} />
                )}
              </div>
            </div>
          )}

          {/* Timeseries Charts */}
          {result.timeseries && result.timeseries.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                Time-Series Activity
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {result.timeseries.map((ts, i) => (
                  <EDATimeSeriesChart key={i} chart={ts} />
                ))}
              </div>
            </div>
          )}

          {/* Bar + Pie Charts */}
          {((result.bar_charts && result.bar_charts.length > 0) ||
            (result.pie_charts && result.pie_charts.length > 0)) && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                Category Breakdowns
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {result.bar_charts?.map((bc, i) => <EDABarChart key={`bar-${i}`} chart={bc} />)}
                {result.pie_charts?.map((pc, i) => <EDAPieChart key={`pie-${i}`} chart={pc} />)}
              </div>
            </div>
          )}

          {/* Heatmap */}
          {result.heatmap && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                Correlation Analysis
              </h3>
              <EDAHeatmap data={result.heatmap} />
            </div>
          )}

          {/* Distributions */}
          {result.distributions && result.distributions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                Numeric Distributions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.distributions.map((d, i) => (
                  <EDADistributionChart key={i} chart={d} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
