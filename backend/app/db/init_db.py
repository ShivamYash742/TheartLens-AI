"""
ThreatLens AI — Database Initialization
Creates all tables from SQLAlchemy models.
"""

from app.models.database import Base
from app.db.session import engine
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def init_db() -> None:
    """Create all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created successfully")


async def drop_db() -> None:
    """Drop all database tables (use with caution)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    logger.warning("All database tables dropped")
