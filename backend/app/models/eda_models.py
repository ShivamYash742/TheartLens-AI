"""
Pydantic models for EDA request/response schemas.

These models define the complete JSON shape returned by the dashboard engine,
including chart-ready datasets, heatmap matrices, hover metadata, and AI summaries.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from enum import Enum

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class ProcessingStatus(str, Enum):
    """Status of an EDA processing job."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ──────────────────────────────────────────────
# Upload response
# ──────────────────────────────────────────────

class UploadResponse(BaseModel):
    """Returned immediately after a file is uploaded."""
    id: str = Field(..., description="Unique job identifier")
    filename: str = Field(..., description="Original uploaded filename")
    status: ProcessingStatus = Field(default=ProcessingStatus.PENDING)
    message: str = Field(default="Processing started")


# ──────────────────────────────────────────────
# Column-level statistics
# ──────────────────────────────────────────────

class ColumnStat(BaseModel):
    """Statistics for a single DataFrame column."""
    column_name: str
    dtype: str
    unique_count: int
    missing_count: int
    missing_percentage: float
    top_values: Optional[Dict[str, int]] = None  # value → count
    mean: Optional[float] = None
    std: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    median: Optional[float] = None


class BasicStats(BaseModel):
    """Aggregate basic statistics for the entire dataset."""
    row_count: int
    column_count: int
    columns: List[ColumnStat]
    memory_usage_mb: float


# ──────────────────────────────────────────────
# Heatmap (correlation matrix)
# ──────────────────────────────────────────────

class HeatmapData(BaseModel):
    """Correlation heatmap matrix — numeric values only, NO image."""
    columns: List[str]
    matrix: List[List[float]]
    hover_data: Optional[Dict[str, str]] = None


# ──────────────────────────────────────────────
# Bar chart
# ──────────────────────────────────────────────

class BarChartData(BaseModel):
    """Generic bar chart with hover metadata."""
    title: str = ""
    labels: List[str]
    values: List[float]
    hover_data: Optional[Dict[str, str]] = None


# ──────────────────────────────────────────────
# Pie chart
# ──────────────────────────────────────────────

class PieChartData(BaseModel):
    """Pie / donut chart with hover metadata."""
    title: str = ""
    labels: List[str]
    values: List[float]
    hover_data: Optional[Dict[str, str]] = None


# ──────────────────────────────────────────────
# Time-series chart
# ──────────────────────────────────────────────

class TimeSeriesData(BaseModel):
    """Time-series frequency chart with hover metadata."""
    title: str = ""
    timestamps: List[str]
    counts: List[int]
    granularity: str = "hourly"  # hourly | daily | weekly
    hover_data: Optional[Dict[str, str]] = None


# ──────────────────────────────────────────────
# Top entities (IP, users, event types, …)
# ──────────────────────────────────────────────

class TopEntity(BaseModel):
    """A ranked entity with its count."""
    name: str
    count: int


class TopEntities(BaseModel):
    """Container for multiple top-entity lists."""
    top_ips: Optional[List[TopEntity]] = None
    top_event_types: Optional[List[TopEntity]] = None
    top_error_sources: Optional[List[TopEntity]] = None
    top_users: Optional[List[TopEntity]] = None


# ──────────────────────────────────────────────
# Distribution chart
# ──────────────────────────────────────────────

class DistributionData(BaseModel):
    """Histogram / distribution for a numeric column."""
    column: str
    bins: List[str]
    counts: List[int]
    hover_data: Optional[Dict[str, str]] = None


# ──────────────────────────────────────────────
# Full EDA result
# ──────────────────────────────────────────────

class EDAResult(BaseModel):
    """Complete EDA result returned by GET /eda/result/{id}."""
    id: str
    filename: str
    status: ProcessingStatus
    stats: Optional[BasicStats] = None
    heatmap: Optional[HeatmapData] = None
    bar_charts: Optional[List[BarChartData]] = None
    pie_charts: Optional[List[PieChartData]] = None
    timeseries: Optional[List[TimeSeriesData]] = None
    top_entities: Optional[TopEntities] = None
    distributions: Optional[List[DistributionData]] = None
    hover_data: Optional[Dict[str, Any]] = None
    ai_summary: Optional[str] = None
    errors: Optional[List[str]] = None
