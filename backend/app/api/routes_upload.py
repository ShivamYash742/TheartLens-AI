"""api/routes_upload.py — POST /upload/upload-file"""
import logging
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.db import crud
from app.db.database import get_db
from app.utils.file_utils import detect_mime, safe_filename, validate_mime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("/upload-file", status_code=202, summary="Upload file for threat intelligence extraction")
async def upload_file(
    file: UploadFile = File(..., description="PDF, DOCX, TXT, or CSV"),
    user_id: str | None = Form(default=None, description="Optional user identifier"),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a security document. Starts async AI extraction pipeline.  
    Returns job_id (poll /status/{job_id}) and file_id (fetch /intel/{file_id}).
    """
    content = await file.read()
    if len(content) > settings.max_file_bytes:
        raise HTTPException(413, f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit")

    original = file.filename or "unknown"
    mime = detect_mime(content, original)
    if not validate_mime(mime):
        raise HTTPException(415, f"Unsupported type: {mime}. Allowed: PDF, DOCX, TXT, CSV")

    stored = safe_filename(original)
    path = settings.UPLOAD_DIR / stored
    path.write_bytes(content)
    logger.info("Saved %s (%d bytes)", stored, len(content))

    db_file = await crud.create_file(db, user_id=user_id, filename=stored,
        original_filename=original, mime_type=mime, file_size=len(content),
        storage_path=str(path.resolve()))
    job = await crud.create_job(db, file_id=db_file.id)
    logger.info("file_id=%s job_id=%s", db_file.id, job.id)

    from app.workers.celery_app import process_file_task
    process_file_task.delay(file_id=str(db_file.id), job_id=str(job.id),
                             storage_path=str(path.resolve()), mime_type=mime)

    return {
        "message": "File accepted. Processing started.",
        "job_id": str(job.id),
        "file_id": str(db_file.id),
        "filename": original,
        "size_bytes": len(content),
        "mime_type": mime,
    }
