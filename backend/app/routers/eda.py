"""
EDA Router — API endpoints for uploading files and retrieving EDA results.

POST /eda/upload   → accepts CSV/JSON, starts background EDA processing
GET  /eda/result/{id}  → returns the full EDA result JSON
GET  /eda/status/{id}  → lightweight status check
GET  /eda/jobs         → list all jobs
DELETE /eda/job/{id}   → delete a job and its upload
"""

from __future__ import annotations

import logging
import shutil
import uuid
from pathlib import Path
from typing import Dict, Any

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from app.models.eda_models import EDAResult, ProcessingStatus, UploadResponse
from app.services.eda_service import run_full_eda
from app.utils.file_loader import detect_file_type, load_dataframe

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/eda", tags=["EDA"])

# ──────────────────────────────────────────────
# In-memory job store (swap for Redis / DB in prod)
# ──────────────────────────────────────────────

_jobs: Dict[str, Dict[str, Any]] = {}

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "storage" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ──────────────────────────────────────────────
# Background worker
# ──────────────────────────────────────────────

async def _process_job(job_id: str, file_path: Path) -> None:
    """Background task: load file → run EDA → store results."""
    try:
        _jobs[job_id]["status"] = ProcessingStatus.PROCESSING
        logger.info("Job %s — loading file %s", job_id, file_path.name)

        df = await load_dataframe(file_path)
        results = await run_full_eda(df)

        _jobs[job_id].update(results)
        _jobs[job_id]["status"] = ProcessingStatus.COMPLETED
        logger.info("Job %s — completed successfully", job_id)

    except Exception as exc:
        logger.exception("Job %s — failed: %s", job_id, exc)
        _jobs[job_id]["status"] = ProcessingStatus.FAILED
        _jobs[job_id]["errors"] = [str(exc)]


# ──────────────────────────────────────────────
# POST /eda/upload
# ──────────────────────────────────────────────

@router.post("/upload", response_model=UploadResponse, status_code=202)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="CSV or JSON log file"),
) -> UploadResponse:
    """
    Upload a CSV or JSON file for EDA processing.

    The file is saved to local storage and a background task is enqueued.
    Returns a job ID that can be used to poll for results.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    # Validate file type
    try:
        detect_file_type(file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Generate job ID & persist file
    job_id = uuid.uuid4().hex[:12]
    dest = UPLOAD_DIR / f"{job_id}_{file.filename}"

    with dest.open("wb") as buf:
        shutil.copyfileobj(file.file, buf)

    logger.info("File saved: %s  (job %s)", dest.name, job_id)

    # Register job
    _jobs[job_id] = {
        "id": job_id,
        "filename": file.filename,
        "status": ProcessingStatus.PENDING,
        "file_path": str(dest),
    }

    # Start background processing
    background_tasks.add_task(_process_job, job_id, dest)

    return UploadResponse(
        id=job_id,
        filename=file.filename,
        status=ProcessingStatus.PENDING,
        message="Processing started — poll GET /eda/result/{id} for results.",
    )


# ──────────────────────────────────────────────
# GET /eda/result/{id}
# ──────────────────────────────────────────────

@router.get("/result/{job_id}", response_model=EDAResult)
async def get_result(job_id: str) -> EDAResult:
    """
    Retrieve the complete EDA result for a given job.

    Returns 404 if the job does not exist.
    Returns 202 (Accepted) if still processing.
    """
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    job = _jobs[job_id]

    if job["status"] in (ProcessingStatus.PENDING, ProcessingStatus.PROCESSING):
        raise HTTPException(
            status_code=202,
            detail=f"Job '{job_id}' is still {job['status'].value}. Try again shortly.",
        )

    return EDAResult(
        id=job["id"],
        filename=job["filename"],
        status=job["status"],
        stats=job.get("stats"),
        heatmap=job.get("heatmap"),
        bar_charts=job.get("bar_charts"),
        pie_charts=job.get("pie_charts"),
        timeseries=job.get("timeseries"),
        top_entities=job.get("top_entities"),
        distributions=job.get("distributions"),
        hover_data=job.get("hover_data"),
        ai_summary=job.get("ai_summary"),
        errors=job.get("errors"),
    )


# ──────────────────────────────────────────────
# GET /eda/status/{id}
# ──────────────────────────────────────────────

@router.get("/status/{job_id}")
async def get_status(job_id: str) -> Dict[str, str]:
    """Lightweight status check without the full payload."""
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return {"id": job_id, "status": _jobs[job_id]["status"].value}


# ──────────────────────────────────────────────
# GET /eda/jobs
# ──────────────────────────────────────────────

@router.get("/jobs")
async def list_jobs() -> list:
    """List all known jobs with their ID, filename, and status."""
    return [
        {"id": j["id"], "filename": j["filename"], "status": j["status"].value}
        for j in _jobs.values()
    ]


# ──────────────────────────────────────────────
# DELETE /eda/job/{id}
# ──────────────────────────────────────────────

@router.delete("/job/{job_id}")
async def delete_job(job_id: str) -> Dict[str, str]:
    """Delete a job and remove its uploaded file."""
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    job = _jobs.pop(job_id)
    file_path = Path(job.get("file_path", ""))
    if file_path.exists():
        file_path.unlink()
        logger.info("Deleted file: %s", file_path)

    return {"id": job_id, "status": "deleted"}
