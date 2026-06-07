from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import os
from pathlib import Path


def _api_dir() -> Path:
    return Path(__file__).resolve().parents[1]


def _default_database_url() -> str:
    return f"sqlite:///{(_api_dir() / 'dev.db').as_posix()}"


@dataclass(frozen=True)
class Settings:
    app_name: str
    api_v1_prefix: str
    database_url: str
    jwt_secret: str
    jwt_algorithm: str
    jwt_expires_seconds: int
    max_daily_sessions_per_user: int
    ai_provider: str
    asr_provider: str
    tts_provider: str
    provider_max_retries: int
    max_daily_user_turns_per_user: int
    max_audio_upload_mb: int
    max_audio_duration_seconds: int
    media_local_root: str


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", "AI Conversation Coach API"),
        api_v1_prefix=os.getenv("API_V1_PREFIX", "/api/v1"),
        database_url=os.getenv("DATABASE_URL", _default_database_url()),
        jwt_secret=os.getenv("JWT_SECRET", "dev-only-change-me"),
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        jwt_expires_seconds=int(os.getenv("JWT_EXPIRES_SECONDS", "604800")),
        max_daily_sessions_per_user=int(os.getenv("MAX_DAILY_SESSIONS_PER_USER", "20")),
        ai_provider=os.getenv("AI_PROVIDER", "mock"),
        asr_provider=os.getenv("ASR_PROVIDER", ""),
        tts_provider=os.getenv("TTS_PROVIDER", ""),
        provider_max_retries=int(os.getenv("PROVIDER_MAX_RETRIES", "2")),
        max_daily_user_turns_per_user=int(os.getenv("MAX_DAILY_USER_TURNS_PER_USER", "120")),
        max_audio_upload_mb=int(os.getenv("MAX_AUDIO_UPLOAD_MB", "20")),
        max_audio_duration_seconds=int(os.getenv("MAX_AUDIO_DURATION_SECONDS", "60")),
        media_local_root=os.getenv(
            "MEDIA_LOCAL_ROOT",
            str((_api_dir() / "tmp" / "media").resolve()),
        ),
    )
