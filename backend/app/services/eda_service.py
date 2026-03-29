"""
EDA Service — the analytical core of the dashboard engine.

Performs exploratory data analysis on an uploaded DataFrame and produces
chart-ready JSON structures (bar, pie, heatmap, timeseries, distributions)
along with hover metadata and an AI summary.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.models.eda_models import (
    BarChartData,
    BasicStats,
    ColumnStat,
    DistributionData,
    HeatmapData,
    PieChartData,
    TimeSeriesData,
    TopEntities,
    TopEntity,
)
from app.utils.time_parser import (
    aggregate_timeseries,
    convert_datetime_columns,
    detect_datetime_columns,
)

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Helper — safe JSON-serialisable floats
# ──────────────────────────────────────────────

def _safe_float(v: Any) -> Optional[float]:
    """Convert numpy / pandas numeric to a JSON-safe float or None."""
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return None
    try:
        return round(float(v), 6)
    except (TypeError, ValueError):
        return None


def _safe_matrix(matrix: Any) -> List[List[float]]:
    """Ensure the correlation matrix is JSON serialisable."""
    result: List[List[float]] = []
    for row in matrix:
        result.append([round(float(v), 4) if not (math.isnan(v) or math.isinf(v)) else 0.0 for v in row])
    return result


# ──────────────────────────────────────────────
# 1. Basic Statistics
# ──────────────────────────────────────────────

def compute_basic_stats(df: pd.DataFrame) -> BasicStats:
    """Compute column-level and dataset-level statistics."""
    columns: List[ColumnStat] = []

    for col in df.columns:
        series = df[col]
        stat = ColumnStat(
            column_name=col,
            dtype=str(series.dtype),
            unique_count=int(series.nunique()),
            missing_count=int(series.isna().sum()),
            missing_percentage=round(float(series.isna().mean()) * 100, 2),
        )

        # Top values for categorical / object columns
        if series.dtype == object or series.dtype.name == "category":
            top = series.value_counts().head(10)
            stat.top_values = {str(k): int(v) for k, v in top.items()}

        # Descriptive stats for numeric columns
        if pd.api.types.is_numeric_dtype(series):
            desc = series.describe()
            stat.mean = _safe_float(desc.get("mean"))
            stat.std = _safe_float(desc.get("std"))
            stat.min = _safe_float(desc.get("min"))
            stat.max = _safe_float(desc.get("max"))
            stat.median = _safe_float(series.median())

        columns.append(stat)

    memory_mb = df.memory_usage(deep=True).sum() / (1024 * 1024)

    return BasicStats(
        row_count=len(df),
        column_count=len(df.columns),
        columns=columns,
        memory_usage_mb=round(memory_mb, 3),
    )


# ──────────────────────────────────────────────
# 2. Correlation Heatmap
# ──────────────────────────────────────────────

def compute_heatmap(df: pd.DataFrame) -> Optional[HeatmapData]:
    """Return correlation matrix for numeric columns."""
    numeric_df = df.select_dtypes(include=[np.number])
    if numeric_df.shape[1] < 2:
        return None

    corr = numeric_df.corr()
    cols = corr.columns.tolist()
    matrix = _safe_matrix(corr.values)

    # Generate hover insights for each column pair
    hover: Dict[str, str] = {}
    for i, c1 in enumerate(cols):
        for j, c2 in enumerate(cols):
            if i < j:
                val = matrix[i][j]
                strength = "strong" if abs(val) > 0.7 else "moderate" if abs(val) > 0.4 else "weak"
                direction = "positive" if val >= 0 else "negative"
                hover[f"{c1}↔{c2}"] = f"{strength} {direction} correlation ({val:.2f})"

    return HeatmapData(columns=cols, matrix=matrix, hover_data=hover)


# ──────────────────────────────────────────────
# 3. Bar Charts (top-N for categorical columns)
# ──────────────────────────────────────────────

def compute_bar_charts(df: pd.DataFrame, top_n: int = 10) -> List[BarChartData]:
    """Generate bar charts for the top-N values of each categorical column."""
    charts: List[BarChartData] = []
    cat_cols = df.select_dtypes(include=["object", "category"]).columns

    for col in cat_cols:
        vc = df[col].value_counts().head(top_n)
        if vc.empty:
            continue

        labels = [str(l) for l in vc.index.tolist()]
        values = [float(v) for v in vc.values.tolist()]

        # Hover metadata
        total = vc.sum()
        hover: Dict[str, str] = {}
        for label, val in zip(labels, values):
            pct = (val / total) * 100 if total else 0
            rank_desc = "highest" if val == max(values) else "lowest" if val == min(values) else "moderate"
            hover[label] = f"{label} accounts for {pct:.1f}% of {col} ({rank_desc} frequency with {int(val)} occurrences)"

        charts.append(BarChartData(
            title=f"Top {len(labels)} — {col}",
            labels=labels,
            values=values,
            hover_data=hover,
        ))

    return charts


# ──────────────────────────────────────────────
# 4. Pie Charts (first suitable categorical column)
# ──────────────────────────────────────────────

def compute_pie_charts(df: pd.DataFrame, max_slices: int = 8) -> List[PieChartData]:
    """Generate pie charts for low-cardinality categorical columns."""
    charts: List[PieChartData] = []
    cat_cols = df.select_dtypes(include=["object", "category"]).columns

    for col in cat_cols:
        nunique = df[col].nunique()
        if nunique < 2 or nunique > 20:
            continue

        vc = df[col].value_counts().head(max_slices)
        labels = [str(l) for l in vc.index.tolist()]
        values = [float(v) for v in vc.values.tolist()]

        # If there are remaining values, group as "Other"
        remaining = int(df[col].notna().sum() - vc.sum())
        if remaining > 0:
            labels.append("Other")
            values.append(float(remaining))

        total = sum(values)
        hover: Dict[str, str] = {}
        for label, val in zip(labels, values):
            pct = (val / total) * 100 if total else 0
            hover[label] = f"{label}: {int(val)} ({pct:.1f}% of total)"

        charts.append(PieChartData(
            title=f"Distribution — {col}",
            labels=labels,
            values=values,
            hover_data=hover,
        ))

    return charts


# ──────────────────────────────────────────────
# 5. Time-Series Charts
# ──────────────────────────────────────────────

def compute_timeseries(df: pd.DataFrame) -> List[TimeSeriesData]:
    """Generate time-series frequency charts for all datetime columns."""
    dt_cols = detect_datetime_columns(df)
    df, converted = convert_datetime_columns(df, dt_cols)
    charts: List[TimeSeriesData] = []

    for col in converted:
        for granularity in ("hourly", "daily", "weekly"):
            timestamps, counts = aggregate_timeseries(df, col, granularity)
            if not timestamps:
                continue

            # Hover data for peaks
            hover: Dict[str, str] = {}
            if counts:
                max_count = max(counts)
                min_count = min(counts)
                avg_count = sum(counts) / len(counts)
                peak_ts = timestamps[counts.index(max_count)]
                hover["peak"] = f"Peak activity of {max_count} events at {peak_ts}"
                hover["average"] = f"Average: {avg_count:.1f} events per {granularity.rstrip('ly')} period"
                hover["minimum"] = f"Minimum activity: {min_count} events"
                hover["total_points"] = f"{len(timestamps)} data points"

            charts.append(TimeSeriesData(
                title=f"{col} — {granularity}",
                timestamps=timestamps,
                counts=counts,
                granularity=granularity,
                hover_data=hover,
            ))

    return charts


# ──────────────────────────────────────────────
# 6. Top Entities
# ──────────────────────────────────────────────

# Heuristics to match common log column names
_IP_HINTS = {"ip", "ip_address", "src_ip", "dst_ip", "source_ip", "dest_ip", "client_ip", "remote_addr", "ipaddress"}
_EVENT_HINTS = {"event", "event_type", "eventtype", "action", "activity", "event_name", "category"}
_ERROR_HINTS = {"error", "error_source", "error_type", "severity", "level", "priority", "status"}
_USER_HINTS = {"user", "username", "user_name", "user_id", "userid", "account", "actor"}


def _find_column(df: pd.DataFrame, hints: set) -> Optional[str]:
    """Find the first column whose lower-cased name matches any hint."""
    for col in df.columns:
        if col.lower().strip().replace(" ", "_") in hints:
            return col
    return None


def compute_top_entities(df: pd.DataFrame, top_n: int = 10) -> TopEntities:
    """Extract top IPs, event types, error sources, and users."""

    def _top(col_name: Optional[str]) -> Optional[List[TopEntity]]:
        if col_name is None or col_name not in df.columns:
            return None
        vc = df[col_name].value_counts().head(top_n)
        return [TopEntity(name=str(k), count=int(v)) for k, v in vc.items()]

    return TopEntities(
        top_ips=_top(_find_column(df, _IP_HINTS)),
        top_event_types=_top(_find_column(df, _EVENT_HINTS)),
        top_error_sources=_top(_find_column(df, _ERROR_HINTS)),
        top_users=_top(_find_column(df, _USER_HINTS)),
    )


# ──────────────────────────────────────────────
# 7. Distributions (histograms for numeric cols)
# ──────────────────────────────────────────────

def compute_distributions(df: pd.DataFrame, max_bins: int = 20) -> List[DistributionData]:
    """Generate histogram distributions for numeric columns."""
    charts: List[DistributionData] = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns

    for col in numeric_cols:
        series = df[col].dropna()
        if series.empty or series.nunique() < 2:
            continue

        counts_arr, bin_edges = np.histogram(series, bins=min(max_bins, series.nunique()))
        bins = [f"{bin_edges[i]:.2f}–{bin_edges[i+1]:.2f}" for i in range(len(counts_arr))]
        counts = [int(c) for c in counts_arr]

        hover: Dict[str, str] = {}
        total = sum(counts)
        for b, c in zip(bins, counts):
            pct = (c / total) * 100 if total else 0
            hover[b] = f"{c} records ({pct:.1f}%) fall in range {b}"

        charts.append(DistributionData(column=col, bins=bins, counts=counts, hover_data=hover))

    return charts


# ──────────────────────────────────────────────
# 8. AI Summary (mock)
# ──────────────────────────────────────────────

def generate_summary(
    stats: BasicStats,
    heatmap: Optional[HeatmapData],
    timeseries: List[TimeSeriesData],
    top_entities: TopEntities,
    bar_charts: List[BarChartData],
) -> str:
    """
    Generate a human-readable AI summary of the EDA results.

    In production this would call an LLM; here we build a rich deterministic summary.
    """
    parts: List[str] = []

    # Dataset overview
    parts.append(
        f"📊 Dataset Overview: {stats.row_count:,} rows × {stats.column_count} columns "
        f"({stats.memory_usage_mb:.1f} MB in memory)."
    )

    # Missing data
    high_missing = [c for c in stats.columns if c.missing_percentage > 20]
    if high_missing:
        cols_str = ", ".join(c.column_name for c in high_missing[:5])
        parts.append(f"⚠️ High missing data in: {cols_str}.")

    # Correlation highlights
    if heatmap and heatmap.hover_data:
        strong = [k for k, v in heatmap.hover_data.items() if "strong" in v]
        if strong:
            parts.append(f"🔗 Strong correlations detected: {', '.join(strong[:5])}.")

    # Time-series insights
    if timeseries:
        for ts in timeseries[:2]:
            if ts.hover_data and "peak" in ts.hover_data:
                parts.append(f"📈 {ts.title}: {ts.hover_data['peak']}.")

    # Top entities
    if top_entities.top_ips:
        top_ip = top_entities.top_ips[0]
        parts.append(f"🌐 Top IP: {top_ip.name} ({top_ip.count:,} events).")
    if top_entities.top_event_types:
        top_evt = top_entities.top_event_types[0]
        parts.append(f"🏷️ Most frequent event type: {top_evt.name} ({top_evt.count:,} occurrences).")
    if top_entities.top_users:
        top_usr = top_entities.top_users[0]
        parts.append(f"👤 Most active user: {top_usr.name} ({top_usr.count:,} actions).")

    # Bar chart highlights
    if bar_charts:
        bc = bar_charts[0]
        parts.append(f"📊 Dominant category in '{bc.title}': {bc.labels[0]} with {int(bc.values[0]):,} records.")

    if not parts:
        return "AI summary: dataset loaded but no significant patterns detected."

    return " ".join(parts)


# ──────────────────────────────────────────────
# 9. Orchestrator — run full EDA pipeline
# ──────────────────────────────────────────────

async def run_full_eda(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Execute the complete EDA pipeline on a DataFrame and return a dict
    matching the EDAResult schema (minus id/filename/status which are
    added by the router).
    """
    logger.info("Starting EDA pipeline on DataFrame (%d×%d)", len(df), len(df.columns))

    stats = compute_basic_stats(df)
    heatmap = compute_heatmap(df)
    bar_charts = compute_bar_charts(df)
    pie_charts = compute_pie_charts(df)
    timeseries_charts = compute_timeseries(df)
    top_entities = compute_top_entities(df)
    distributions = compute_distributions(df)

    ai_summary = generate_summary(stats, heatmap, timeseries_charts, top_entities, bar_charts)

    # Build global hover_data (aggregate)
    hover_data: Dict[str, Any] = {}
    if heatmap and heatmap.hover_data:
        hover_data["heatmap"] = heatmap.hover_data
    for bc in bar_charts:
        if bc.hover_data:
            hover_data[f"bar_{bc.title}"] = bc.hover_data
    for pc in pie_charts:
        if pc.hover_data:
            hover_data[f"pie_{pc.title}"] = pc.hover_data
    for ts in timeseries_charts:
        if ts.hover_data:
            hover_data[f"ts_{ts.title}"] = ts.hover_data

    logger.info("EDA pipeline complete.")

    return {
        "stats": stats,
        "heatmap": heatmap,
        "bar_charts": bar_charts if bar_charts else None,
        "pie_charts": pie_charts if pie_charts else None,
        "timeseries": timeseries_charts if timeseries_charts else None,
        "top_entities": top_entities,
        "distributions": distributions if distributions else None,
        "hover_data": hover_data if hover_data else None,
        "ai_summary": ai_summary,
    }
