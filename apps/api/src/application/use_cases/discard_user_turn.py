from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from src.domain.models.practice_session import PracticeSession
from src.domain.services.practice_session_service import PracticeSessionService
from src.schemas.practice import DiscardTurnResponse


@dataclass(frozen=True)
class DiscardUserTurnCommand:
    session: PracticeSession
    turn_id: str


def discard_user_turn(db: Session, command: DiscardUserTurnCommand) -> DiscardTurnResponse:
    return PracticeSessionService(db).discard_user_turn(
        session=command.session,
        turn_id=command.turn_id,
    )
