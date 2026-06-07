from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class HistorySessionItemResponse(BaseModel):
    id: str
    scenario_name: str
    created_at: datetime
    duration_sec: int
    overall_score: int | None = None
    level_description: str | None = None


class PaginationResponse(BaseModel):
    page: int
    page_size: int
    total: int


class HistoryListResponse(BaseModel):
    items: list[HistorySessionItemResponse]
    pagination: PaginationResponse


class ScoreTrendItemResponse(BaseModel):
    date: str
    score: int


class MeStatsResponse(BaseModel):
    practice_count: int
    spoken_minutes: int
    user_word_count: int
    average_score: int | None = None
    score_trend: list[ScoreTrendItemResponse]


class HistoryListQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=50)
    scenario_slug: str | None = None
