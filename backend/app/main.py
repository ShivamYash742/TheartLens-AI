"""main.py — FastAPI application factory with lifespan, CORS, and routers."""
from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)
logger = logging.getLogger("threatlens")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 ThreatLens AI Backend starting...")
    try:
        from app.services.mitre_mapper import preload_mitre_data
        await preload_mitre_data()
        logger.info("✓ MITRE ATT&CK data ready")
    except Exception as e:
        logger.warning("⚠ MITRE pre-load failed — will retry on first use: %s", e)
    yield
    logger.info("👋 Backend shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "**ThreatLens AI Backend** — Cybersecurity intelligence extraction.\n\n"
            "Upload PDF/DOCX/TXT/CSV → AI extracts CVEs, IOCs, MITRE TTPs → STIX 2.1 bundle."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.api.routes_upload import router as upload_router
    from app.api.routes_status import router as status_router
    from app.api.routes_intel import router as intel_router

    app.include_router(upload_router)
    app.include_router(status_router)
    app.include_router(intel_router)

    @app.get("/health", tags=["Health"])
    async def health():
        return {
            "status": "ok",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "llm_provider": settings.LLM_PROVIDER,
        }

    return app


app = create_app()
