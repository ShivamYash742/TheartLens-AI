"""db/crud.py — All database CRUD operations."""
from __future__ import annotations
import uuid
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.db_models import ExtractedText, File, IntelEntity, Job, MitreMapping, StixBundle

async def create_file(db, *, user_id, filename, original_filename, mime_type, file_size, storage_path):
    obj = File(user_id=user_id, filename=filename, original_filename=original_filename,
               mime_type=mime_type, file_size=file_size, storage_path=storage_path)
    db.add(obj); await db.flush(); await db.refresh(obj); return obj

async def get_file(db, file_id):
    r = await db.execute(select(File).where(File.id == file_id))
    return r.scalar_one_or_none()

async def create_job(db, file_id):
    obj = Job(file_id=file_id)
    db.add(obj); await db.flush(); await db.refresh(obj); return obj

async def get_job_by_id(db, job_id):
    r = await db.execute(select(Job).where(Job.id == job_id))
    return r.scalar_one_or_none()

async def get_job_by_file(db, file_id):
    r = await db.execute(select(Job).where(Job.file_id == file_id))
    return r.scalar_one_or_none()

async def update_job_status(db, job_id, *, status, error=None):
    job = await get_job_by_id(db, job_id)
    if job:
        job.status = status; job.error_message = error; await db.flush()
    return job

async def save_extracted_text(db, file_id, content):
    obj = ExtractedText(file_id=file_id, content=content, char_count=len(content))
    db.add(obj); await db.flush(); return obj

async def get_extracted_text(db, file_id):
    r = await db.execute(select(ExtractedText).where(ExtractedText.file_id == file_id))
    return r.scalar_one_or_none()

async def save_intel(db, file_id, data):
    obj = IntelEntity(file_id=file_id, data=data)
    db.add(obj); await db.flush(); return obj

async def get_intel(db, file_id):
    r = await db.execute(select(IntelEntity).where(IntelEntity.file_id == file_id))
    return r.scalar_one_or_none()

async def save_stix(db, file_id, bundle):
    obj = StixBundle(file_id=file_id, bundle=bundle)
    db.add(obj); await db.flush(); return obj

async def get_stix(db, file_id):
    r = await db.execute(select(StixBundle).where(StixBundle.file_id == file_id))
    return r.scalar_one_or_none()

async def save_mitre(db, file_id, techniques):
    obj = MitreMapping(file_id=file_id, techniques=techniques)
    db.add(obj); await db.flush(); return obj

async def get_mitre(db, file_id):
    r = await db.execute(select(MitreMapping).where(MitreMapping.file_id == file_id))
    return r.scalar_one_or_none()

async def get_dashboard_data(db, user_id: str) -> dict:
    result = await db.execute(
        select(IntelEntity).join(File).where(File.user_id == user_id)
        .order_by(desc(IntelEntity.extracted_at)).limit(100)
    )
    rows = list(result.scalars().all())
    top_vulns, sev_counts = [], {}
    ioc_stats = {"ips": 0, "urls": 0, "domains": 0, "hashes": 0}
    for row in rows:
        d = row.data or {}
        for cve in d.get("cves", []):
            top_vulns.append({"cve": cve, "file_id": str(row.file_id), "severity": d.get("severity", "Unknown")})
        sev = d.get("severity", "Unknown")
        sev_counts[sev] = sev_counts.get(sev, 0) + 1
        for k in ("ips", "urls", "domains", "hashes"):
            ioc_stats[k] += len(d.get("iocs", {}).get(k, []))
    freq: dict = {}
    mr = await db.execute(select(MitreMapping).join(File).where(File.user_id == user_id))
    for mm in mr.scalars().all():
        for t in mm.techniques or []:
            tid = t.get("technique_id", "?")
            freq[tid] = freq.get(tid, 0) + 1
    return {
        "top_vulnerabilities": top_vulns[:20],
        "severity_chart": [{"severity": k, "count": v} for k, v in sev_counts.items()],
        "ioc_stats": ioc_stats,
        "mitre_heatmap": [{"technique_id": k, "count": v} for k, v in sorted(freq.items(), key=lambda x: -x[1])][:30],
    }
