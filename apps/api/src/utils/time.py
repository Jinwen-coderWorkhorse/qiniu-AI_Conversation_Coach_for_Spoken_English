from __future__ import annotations

from datetime import UTC, datetime


def utc_now() -> datetime:
    return datetime.now(UTC)


def utc_day_start() -> datetime:
    now = utc_now()
    return now.replace(hour=0, minute=0, second=0, microsecond=0)
