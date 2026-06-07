from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from src.api.deps import DbSession, get_current_user
from src.domain.models.user import User
from src.domain.services.history_service import HistoryService
from src.schemas.history import HistoryListResponse, MeStatsResponse

router = APIRouter(tags=["History"])


@router.get("/practice-sessions", response_model=HistoryListResponse)
def list_practice_history(
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
    scenario_slug: Annotated[str | None, Query()] = None,
) -> HistoryListResponse:
    return HistoryService(db).list_history(
        current_user,
        page=page,
        page_size=page_size,
        scenario_slug=scenario_slug,
    )


@router.get("/me/stats", response_model=MeStatsResponse)
def get_my_stats(
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> MeStatsResponse:
    return HistoryService(db).get_stats(current_user)
