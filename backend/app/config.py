"""ThreatLens AI FastAPI Backend — config.py"""
from pathlib import Path
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore")
    APP_NAME: str = "ThreatLens AI Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "https://*.railway.app"]
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/threatlens"
    REDIS_URL: str = "redis://localhost:6379/0"
    UPLOAD_DIR: Path = Path("uploads")
    MAX_FILE_SIZE_MB: int = 50
    LLM_PROVIDER: Literal["openai", "ollama", "openrouter"] = "ollama"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OLLAMA_HOST: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "qwen2.5:7b"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "nvidia/nemotron-3-super-120b-a12b:free"
    MITRE_ATTACK_CACHE: Path = Path("data/enterprise-attack.json")

    @property
    def max_file_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
Path("data").mkdir(parents=True, exist_ok=True)
