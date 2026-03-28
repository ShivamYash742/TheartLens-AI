"""
Initial database schema migration.

Creates all tables:
    - files
    - extracted_text
    - intel_entities
    - stix_bundles
    - mitre_mappings
    - jobs
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── files ──────────────────────────────────────────────────────────
    op.create_table(
        "files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(255), nullable=True, index=True),
        sa.Column("filename", sa.String(512), nullable=False),
        sa.Column("original_filename", sa.String(512), nullable=False),
        sa.Column("mime_type", sa.String(128), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── extracted_text ──────────────────────────────────────────────────
    op.create_table(
        "extracted_text",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("file_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("files.id", ondelete="CASCADE"), unique=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("char_count", sa.Integer(), nullable=False),
        sa.Column("extracted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── intel_entities ──────────────────────────────────────────────────
    op.create_table(
        "intel_entities",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("file_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("files.id", ondelete="CASCADE"), unique=True),
        sa.Column("data", postgresql.JSONB(), nullable=False),
        sa.Column("extracted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── stix_bundles ────────────────────────────────────────────────────
    op.create_table(
        "stix_bundles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("file_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("files.id", ondelete="CASCADE"), unique=True),
        sa.Column("bundle", postgresql.JSONB(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── mitre_mappings ──────────────────────────────────────────────────
    op.create_table(
        "mitre_mappings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("file_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("files.id", ondelete="CASCADE"), unique=True),
        sa.Column("techniques", postgresql.JSONB(), nullable=False),
        sa.Column("mapped_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── jobs ────────────────────────────────────────────────────────────
    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("file_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("files.id", ondelete="CASCADE"), unique=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(),
                  onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("jobs")
    op.drop_table("mitre_mappings")
    op.drop_table("stix_bundles")
    op.drop_table("intel_entities")
    op.drop_table("extracted_text")
    op.drop_table("files")
