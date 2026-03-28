"""workers/celery_app.py — Celery worker with full extraction pipeline."""
from __future__ import annotations
import asyncio, logging, uuid
from typing import Any
from celery import Celery
from app.config import settings

logger = logging.getLogger(__name__)

celery_app = Celery("threatlens", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(
    task_serializer="json", accept_content=["json"], result_serializer="json",
    timezone="UTC", enable_utc=True, task_track_started=True,
    task_acks_late=True, worker_prefetch_multiplier=1,
)


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _pipeline(file_id_str: str, job_id_str: str, storage_path: str, mime_type: str):
    from app.db.database import AsyncSessionLocal
    from app.db import crud
    from app.services.file_processor import extract_text
    from app.services.ai_extractor import extract_threat_intel
    from app.services.mitre_mapper import map_ttps
    from app.services.stix_generator import generate_stix_bundle

    file_id = uuid.UUID(file_id_str)
    job_id = uuid.UUID(job_id_str)

    async with AsyncSessionLocal() as db:
        try:
            # 1. Mark processing
            await crud.update_job_status(db, job_id, status="processing")
            await db.commit()
            logger.info("[Job %s] → processing", job_id)

            # 2. Extract text
            text = extract_text(storage_path, mime_type)
            await crud.save_extracted_text(db, file_id, text)
            await db.commit()
            logger.info("[Job %s] Extracted %d chars", job_id, len(text))

            # 3. AI extraction
            intel = await extract_threat_intel(text)
            await crud.save_intel(db, file_id, intel.to_dict())
            await db.commit()
            logger.info("[Job %s] Found %d CVEs, %d malware", job_id, len(intel.cves), len(intel.malware_names))

            # 4. MITRE mapping
            techniques = map_ttps(intel.ttp_clues)
            await crud.save_mitre(db, file_id, techniques)
            await db.commit()
            logger.info("[Job %s] Matched %d MITRE techniques", job_id, len(techniques))

            # 5. STIX bundle
            bundle = generate_stix_bundle(intel.to_dict(), techniques)
            await crud.save_stix(db, file_id, bundle)
            await db.commit()

            # 6. Complete
            await crud.update_job_status(db, job_id, status="completed")
            await db.commit()
            logger.info("[Job %s] ✓ Pipeline complete", job_id)

        except Exception as exc:
            logger.error("[Job %s] Pipeline failed: %s", job_id, exc, exc_info=True)
            await db.rollback()
            async with AsyncSessionLocal() as edb:
                await crud.update_job_status(edb, job_id, status="failed", error=str(exc))
                await edb.commit()
            raise


@celery_app.task(name="workers.process_file", bind=True, max_retries=2, default_retry_delay=30)
def process_file_task(self, file_id: str, job_id: str, storage_path: str, mime_type: str) -> dict[str, Any]:
    """Celery task: run the full extraction pipeline for an uploaded file."""
    logger.info("Task started: file=%s job=%s", file_id, job_id)
    try:
        _run_async(_pipeline(file_id, job_id, storage_path, mime_type))
        return {"file_id": file_id, "job_id": job_id, "status": "completed"}
    except Exception as exc:
        try:
            self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return {"file_id": file_id, "job_id": job_id, "status": "failed", "error": str(exc)}
