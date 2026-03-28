"""api/routes_intel.py — GET /intel/{file_id}, /stix/{file_id}, /dashboard/{user_id}"""
import uuid as _uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import crud
from app.db.database import get_db

router = APIRouter(tags=["Intelligence"])

def _parse(val: str, label: str = "id") -> _uuid.UUID:
    try: return _uuid.UUID(val)
    except ValueError: raise HTTPException(400, f"Invalid {label}")

@router.get("/intel/{file_id}", summary="Get extracted threat intel for a file")
async def get_intel(file_id: str, db: AsyncSession = Depends(get_db)):
    uid = _parse(file_id, "file_id")
    if not await crud.get_file(db, uid): raise HTTPException(404, "File not found")
    intel = await crud.get_intel(db, uid)
    if not intel:
        job = await crud.get_job_by_file(db, uid)
        if job and job.status in ("pending", "processing"):
            raise HTTPException(202, f"Processing in progress (status: {job.status})")
        raise HTTPException(404, "No intel found for this file")
    mitre = await crud.get_mitre(db, uid)
    return {"file_id": file_id, "intel": intel.data,
            "mitre_techniques": mitre.techniques if mitre else [],
            "extracted_at": intel.extracted_at.isoformat()}

@router.get("/stix/{file_id}", summary="Get STIX 2.1 bundle")
async def get_stix(file_id: str, db: AsyncSession = Depends(get_db)):
    uid = _parse(file_id, "file_id")
    stix = await crud.get_stix(db, uid)
    if not stix: raise HTTPException(404, "No STIX bundle found")
    return {"file_id": file_id, "generated_at": stix.generated_at.isoformat(), "bundle": stix.bundle}

@router.get("/dashboard/{user_id}", summary="Get aggregated dashboard data")
async def get_dashboard(user_id: str, db: AsyncSession = Depends(get_db)):
    """Returns top_vulnerabilities, severity_chart, ioc_stats, mitre_heatmap"""
    data = await crud.get_dashboard_data(db, user_id)
    return {"user_id": user_id, **data}
