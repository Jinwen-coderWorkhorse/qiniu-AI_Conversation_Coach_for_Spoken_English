from __future__ import annotations

from sqlalchemy.orm import Session

from src.domain.models.user import User
from src.domain.services.practice_session_service import PracticeSessionService
from src.schemas.practice import CreatePracticeSessionResponse


def create_practice_session(
    db: Session,
    *,
    user: User,
    scenario_slug: str,
) -> CreatePracticeSessionResponse:
    return PracticeSessionService(db).create_session(
        user=user,
        scenario_slug=scenario_slug,
    )
