"""
ThreatLens AI — SQLAlchemy ORM Models
All database tables for the threat intelligence pipeline.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, Float, DateTime, JSON, ForeignKey, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship
import enum


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


# ── Enums ─────────────────────────────────────────────────────────────────────

class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FileType(str, enum.Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    CSV = "csv"
    UNKNOWN = "unknown"


class Severity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"
    UNKNOWN = "unknown"


# ── Models ────────────────────────────────────────────────────────────────────

class FileRecord(Base):
    """Uploaded file metadata and processing status."""
    __tablename__ = "files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(512), nullable=False)
    original_filename = Column(String(512), nullable=False)
    file_type = Column(SAEnum(FileType), nullable=False, default=FileType.UNKNOWN)
    file_size = Column(Integer, nullable=False)  # bytes
    mime_type = Column(String(128))
    storage_path = Column(String(1024), nullable=False)
    job_status = Column(SAEnum(JobStatus), nullable=False, default=JobStatus.PENDING)
    job_error = Column(Text, nullable=True)
    user_id = Column(String(255), nullable=True)  # Optional: Clerk user ID
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    processed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    extracted_text = relationship("ExtractedText", back_populates="file", uselist=False, cascade="all, delete-orphan")
    intel_entities = relationship("IntelEntity", back_populates="file", cascade="all, delete-orphan")
    stix_bundle = relationship("StixBundle", back_populates="file", uselist=False, cascade="all, delete-orphan")
    mitre_mappings = relationship("MitreMapping", back_populates="file", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<FileRecord {self.filename} [{self.job_status}]>"


class ExtractedText(Base):
    """Raw text extracted from uploaded files."""
    __tablename__ = "extracted_text"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), nullable=False, unique=True)
    raw_text = Column(Text, nullable=False)
    char_count = Column(Integer, nullable=False, default=0)
    page_count = Column(Integer, nullable=True)  # For PDFs
    extracted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    file = relationship("FileRecord", back_populates="extracted_text")

    def __repr__(self) -> str:
        return f"<ExtractedText file={self.file_id} chars={self.char_count}>"


class IntelEntity(Base):
    """Individual extracted threat intelligence entities."""
    __tablename__ = "intel_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    entity_type = Column(String(64), nullable=False)  # cve, malware, ip, url, domain, hash, threat_actor, product, attack_vector
    value = Column(Text, nullable=False)
    severity = Column(SAEnum(Severity), default=Severity.UNKNOWN)
    confidence = Column(Float, default=0.0)  # 0.0 to 1.0
    context = Column(Text, nullable=True)  # Surrounding text for context
    metadata_ = Column("metadata", JSON, nullable=True)  # Extra structured data
    extracted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    file = relationship("FileRecord", back_populates="intel_entities")

    def __repr__(self) -> str:
        return f"<IntelEntity {self.entity_type}={self.value}>"


class StixBundle(Base):
    """STIX 2.1 structured output for a file."""
    __tablename__ = "stix_bundle"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), nullable=False, unique=True)
    bundle_json = Column(JSON, nullable=False)
    object_count = Column(Integer, default=0)
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    file = relationship("FileRecord", back_populates="stix_bundle")

    def __repr__(self) -> str:
        return f"<StixBundle file={self.file_id} objects={self.object_count}>"


class MitreMapping(Base):
    """MITRE ATT&CK technique mappings for a file."""
    __tablename__ = "mitre_mapping"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    technique_id = Column(String(32), nullable=False)   # e.g. T1566
    technique_name = Column(String(256), nullable=False)
    tactic = Column(String(128), nullable=True)          # e.g. Initial Access
    sub_technique = Column(String(32), nullable=True)     # e.g. T1566.001
    confidence = Column(Float, default=0.0)
    matched_text = Column(Text, nullable=True)
    mapped_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    file = relationship("FileRecord", back_populates="mitre_mappings")

    def __repr__(self) -> str:
        return f"<MitreMapping {self.technique_id} — {self.technique_name}>"


class DashboardCache(Base):
    """Pre-computed dashboard data for fast retrieval."""
    __tablename__ = "dashboard_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    cache_key = Column(String(128), nullable=False)  # e.g. "severity_dist", "top_cves"
    cache_data = Column(JSON, nullable=False)
    computed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<DashboardCache {self.cache_key} user={self.user_id}>"
