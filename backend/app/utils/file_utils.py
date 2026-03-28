"""utils/file_utils.py — File handling utilities."""
import hashlib, mimetypes, uuid
from pathlib import Path

try:
    import magic
    _USE_MAGIC = True
except ImportError:
    _USE_MAGIC = False

ALLOWED_MIMES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain", "text/csv", "application/csv", "text/x-csv",
}

def detect_mime(file_bytes: bytes, filename: str) -> str:
    if _USE_MAGIC:
        return magic.from_buffer(file_bytes[:2048], mime=True)
    mime, _ = mimetypes.guess_type(filename)
    return mime or "application/octet-stream"

def validate_mime(mime_type: str) -> bool:
    return mime_type in ALLOWED_MIMES

def safe_filename(original: str) -> str:
    return f"{uuid.uuid4().hex}{Path(original).suffix.lower()}"

def compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
