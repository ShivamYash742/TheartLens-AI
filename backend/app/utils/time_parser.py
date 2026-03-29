"""
Time parser utility.

Automatically detects datetime columns in a DataFrame and converts them to
proper pandas datetime types.  Provides helpers for time-series aggregation.
"""

from __future__ import annotations

import logging
from typing import List, Optional, Tuple

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# Common column names that usually contain timestamps
_DATETIME_HINTS = {
    "timestamp", "time", "date", "datetime", "created_at", "updated_at",
    "event_time", "log_time", "start_time", "end_time", "occurred_at",
    "created", "modified", "logged_at", "ts", "event_date",
}


def detect_datetime_columns(df: pd.DataFrame) -> List[str]:
    """
    Return a list of column names that contain (or can be parsed as) datetime values.

    Strategy:
      1. Columns already of dtype datetime64 are returned immediately.
      2. Object/string columns whose name hints at a datetime are attempted.
      3. Object/string columns where ≥60 % of non-null values parse as dates.
    """
    dt_cols: List[str] = []

    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            dt_cols.append(col)
            continue

        if not (df[col].dtype == object or pd.api.types.is_string_dtype(df[col])):
            continue

        # Hint-based check
        if col.lower().strip().replace(" ", "_") in _DATETIME_HINTS:
            try:
                pd.to_datetime(df[col].dropna().head(20), format="mixed")
                dt_cols.append(col)
                continue
            except Exception:
                pass

        # Sample-based check
        sample = df[col].dropna().head(50)
        if len(sample) == 0:
            continue
        try:
            parsed = pd.to_datetime(sample, format="mixed", errors="coerce")
            ratio = parsed.notna().sum() / len(sample)
            if ratio >= 0.6:
                dt_cols.append(col)
        except Exception:
            pass

    logger.info("Detected datetime columns: %s", dt_cols)
    return dt_cols


def convert_datetime_columns(df: pd.DataFrame, columns: Optional[List[str]] = None) -> Tuple[pd.DataFrame, List[str]]:
    """
    Convert detected (or given) columns to datetime dtype **in-place** and
    return the modified DataFrame plus the list of successfully converted columns.
    """
    if columns is None:
        columns = detect_datetime_columns(df)

    converted: List[str] = []
    for col in columns:
        try:
            df[col] = pd.to_datetime(df[col], format="mixed", errors="coerce")
            # Drop rows where conversion failed (NaT) only if >80% were valid
            valid_ratio = df[col].notna().sum() / len(df)
            if valid_ratio >= 0.5:
                converted.append(col)
                logger.info("Converted column '%s' to datetime (%.0f%% valid)", col, valid_ratio * 100)
            else:
                logger.warning("Column '%s' had too many NaT after conversion (%.0f%% valid), skipping", col, valid_ratio * 100)
        except Exception as exc:
            logger.warning("Failed to convert '%s': %s", col, exc)

    return df, converted


def aggregate_timeseries(
    df: pd.DataFrame,
    datetime_col: str,
    granularity: str = "hourly",
) -> Tuple[List[str], List[int]]:
    """
    Aggregate event counts by time granularity.

    Args:
        df: DataFrame with a datetime column already converted.
        datetime_col: Name of the datetime column.
        granularity: One of 'hourly', 'daily', 'weekly'.

    Returns:
        Tuple of (timestamps as ISO strings, counts).
    """
    freq_map = {"hourly": "h", "daily": "D", "weekly": "W"}
    freq = freq_map.get(granularity, "h")

    series = df[datetime_col].dropna()
    if series.empty:
        return [], []

    if freq == "W":
        counts = series.dt.to_period("W-SUN").dt.to_timestamp().value_counts().sort_index()
    else:
        counts = series.dt.floor(freq).value_counts().sort_index()
    timestamps = [ts.isoformat() for ts in counts.index]
    values = counts.values.tolist()
    return timestamps, values
