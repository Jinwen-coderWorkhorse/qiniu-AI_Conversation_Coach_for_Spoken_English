from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import os
from pathlib import Path


def _api_dir() -> Path:
    return Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    app_name: str = "AI Conversation Coach API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(_api_dir() / 'dev.db').as_posix()}",
    )
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-only-change-me")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expires_seconds: int = int(os.getenv("JWT_EXPIRES_SECONDS", "604800"))
    max_daily_sessions_per_user: int = int(
        os.getenv("MAX_DAILY_SESSIONS_PER_USER", "20")
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
