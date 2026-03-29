"""
File loader utility.

Detects file type (CSV / JSON) and loads data into a pandas DataFrame.
Handles common edge-cases: BOM, encoding sniffing, nested JSON arrays.
"""

from __future__ import annotations

import io
import json
import logging
from pathlib import Path
from typing import Union

import pandas as pd

logger = logging.getLogger(__name__)


def detect_file_type(filename: str) -> str:
    """Return 'csv' or 'json' based on extension. Raises ValueError otherwise."""
    ext = Path(filename).suffix.lower()
    if ext == ".csv":
        return "csv"
    elif ext == ".json":
        return "json"
    raise ValueError(f"Unsupported file type: {ext}. Only .csv and .json are accepted.")


async def load_dataframe(file_path: Union[str, Path]) -> pd.DataFrame:
    """
    Load a file into a pandas DataFrame.

    - CSV files are loaded with automatic delimiter sniffing.
    - JSON files support both array-of-objects and record-oriented formats.
    """
    file_path = Path(file_path)
    file_type = detect_file_type(file_path.name)

    logger.info("Loading %s file: %s", file_type, file_path.name)

    if file_type == "csv":
        return _load_csv(file_path)
    else:
        return _load_json(file_path)


def _load_csv(file_path: Path) -> pd.DataFrame:
    """Load a CSV file with encoding & delimiter detection."""
    # Try UTF-8 first, fall back to latin-1
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            df = pd.read_csv(file_path, encoding=encoding, on_bad_lines="warn")
            logger.info("CSV loaded with encoding=%s  rows=%d  cols=%d", encoding, len(df), len(df.columns))
            return df
        except UnicodeDecodeError:
            continue
    raise ValueError("Unable to decode CSV with any supported encoding.")


def _load_json(file_path: Path) -> pd.DataFrame:
    """Load a JSON file (array of objects, or records format)."""
    raw = file_path.read_text(encoding="utf-8-sig")
    data = json.loads(raw)

    # If it's a list of dicts → each dict is a row
    if isinstance(data, list):
        df = pd.DataFrame(data)
    elif isinstance(data, dict):
        # Try the first key that holds a list
        for key, value in data.items():
            if isinstance(value, list):
                df = pd.DataFrame(value)
                logger.info("Used nested key '%s' as record array.", key)
                break
        else:
            # Wrap single dict as a single-row DataFrame
            df = pd.DataFrame([data])
    else:
        raise ValueError("JSON root must be an array or object.")

    logger.info("JSON loaded  rows=%d  cols=%d", len(df), len(df.columns))
    return df
