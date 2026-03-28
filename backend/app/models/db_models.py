"""models/db_models.py — SQLAlchemy ORM table definitions."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

def _now():
    return datetime.now(timezone.utc)

class Base(DeclarativeBase):
    pass

class File(Base):
    __tablename__ = "files"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    extracted_text: Mapped["ExtractedText | None"] = relationship(back_populates="file", uselist=False, cascade="all, delete-orphan")
    intel: Mapped["IntelEntity | None"] = relationship(back_populates="file", uselist=False, cascade="all, delete-orphan")
    stix_bundle: Mapped["StixBundle | None"] = relationship(back_populates="file", uselist=False, cascade="all, delete-orphan")
    mitre_mapping: Mapped["MitreMapping | None"] = relationship(back_populates="file", uselist=False, cascade="all, delete-orphan")
    job: Mapped["Job | None"] = relationship(back_populates="file", uselist=False, cascade="all, delete-orphan")

class ExtractedText(Base):
    __tablename__ = "extracted_text"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), unique=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    char_count: Mapped[int] = mapped_column(Integer, nullable=False)
    extracted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    file: Mapped["File"] = relationship(back_populates="extracted_text")

class IntelEntity(Base):
    __tablename__ = "intel_entities"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), unique=True)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    extracted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    file: Mapped["File"] = relationship(back_populates="intel")

class StixBundle(Base):
    __tablename__ = "stix_bundles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), unique=True)
    bundle: Mapped[dict] = mapped_column(JSONB, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    file: Mapped["File"] = relationship(back_populates="stix_bundle")

class MitreMapping(Base):
    __tablename__ = "mitre_mappings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), unique=True)
    techniques: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    mapped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    file: Mapped["File"] = relationship(back_populates="mitre_mapping")

class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), unique=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
    file: Mapped["File"] = relationship(back_populates="job")
