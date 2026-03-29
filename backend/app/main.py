"""
Dashboard Engine — FastAPI Application Entry Point.

Provides:
  • CORS middleware for React/Next.js frontend integration
  • Health-check endpoint at /
  • EDA router mounted at /eda/*
  • Auto-generated OpenAPI docs at /docs
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.eda import router as eda_router

# ──────────────────────────────────────────────
# Logging configuration
# ──────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# FastAPI app
# ──────────────────────────────────────────────

app = FastAPI(
    title="Dashboard Engine API",
    description=(
        "Backend EDA engine that accepts CSV/JSON log files, performs exploratory "
        "data analysis, and returns chart-ready JSON (heatmaps, bar charts, pie charts, "
        "time-series, distributions) with cursor-hover metadata."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ──────────────────────────────────────────────
# CORS — allow React/Next.js frontends
# ──────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────

app.include_router(eda_router)

# ──────────────────────────────────────────────
# Root health-check
# ──────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    """Health-check / welcome endpoint."""
    return {
        "service": "Dashboard Engine API",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Detailed health-check."""
    return {"status": "ok"}
