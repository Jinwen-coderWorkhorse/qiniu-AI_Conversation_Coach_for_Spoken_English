from typing import Annotated

from fastapi import APIRouter, Depends

from src.api.deps import DbSession, get_current_user, require_session_owner
from src.domain.models.practice_session import PracticeSession
from src.domain.models.user import User
from src.domain.services.practice_session_service import PracticeSessionService
from src.schemas.practice import (
    CreatePracticeSessionRequest,
    CreatePracticeSessionResponse,
    PracticeSessionDetailResponse,
)

router = APIRouter(prefix="/practice-sessions", tags=["PracticeSession"])


@router.post("", response_model=CreatePracticeSessionResponse)
def create_practice_session(
    payload: CreatePracticeSessionRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> CreatePracticeSessionResponse:
    return PracticeSessionService(db).create_session(
        user=current_user,
        scenario_slug=payload.scenario_slug,
    )


@router.get("/{id}", response_model=PracticeSessionDetailResponse)
def get_practice_session(
    db: DbSession,
    owned_session: Annotated[PracticeSession, Depends(require_session_owner)],
) -> PracticeSessionDetailResponse:
    return PracticeSessionService(db).get_session_detail(owned_session)
