# ── ThreatLens AI Backend — Dockerfile
# Multi-stage build: keeps the final image lean.

FROM python:3.11-slim AS base

# System deps for PyMuPDF, python-magic, psycopg
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    libgl1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Dependencies ─────────────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ──────────────────────────────────────────────────────────
COPY . .

# Create required directories
RUN mkdir -p uploads data

# ── Expose port ───────────────────────────────────────────────────────────────
EXPOSE 8000

# ── Default command: run the FastAPI server ───────────────────────────────────
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
