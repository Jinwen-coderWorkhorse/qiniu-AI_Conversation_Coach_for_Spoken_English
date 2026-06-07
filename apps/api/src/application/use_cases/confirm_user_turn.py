from __future__ import annotations

from dataclasses import dataclass

from fastapi import status
from sqlalchemy.orm import Session

from src.application.conversation_orchestrator import (
    ConversationOrchestrator,
    GenerateAiReplyCommand,
)
from src.domain.models.practice_session import PracticeSession
from src.domain.models.user import User
from src.schemas.errors import ApiError
from src.schemas.practice import ConfirmTurnResponse


@dataclass(frozen=True)
class ConfirmUserTurnCommand:
    user: User
    session: PracticeSession
    turn_id: str
    accepted: bool


def confirm_user_turn(db: Session, command: ConfirmUserTurnCommand) -> ConfirmTurnResponse:
    if not command.accepted:
        raise ApiError("VALIDATION_ERROR", "请求参数不合法。", status.HTTP_422_UNPROCESSABLE_ENTITY)

    return ConversationOrchestrator(db).generate_ai_reply(
        GenerateAiReplyCommand(
            user=command.user,
            session=command.session,
            user_turn_id=command.turn_id,
        )
    )
