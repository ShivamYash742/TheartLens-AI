"""api/routes_status.py — GET /status/{job_id}"""
import uuid as _uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import crud
from app.db.database import get_db

router = APIRouter(prefix="/status", tags=["Status"])

@router.get("/{job_id}", summary="Get processing status for a job")
async def get_status(job_id: str, db: AsyncSession = Depends(get_db)):
    """Poll status: pending | processing | completed | failed"""
    try:
        uid = _uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(400, "Invalid job_id format")
    job = await crud.get_job_by_id(db, uid)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found")
    return {
        "job_id": str(job.id), "file_id": str(job.file_id),
        "status": job.status, "error": job.error_message,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }
