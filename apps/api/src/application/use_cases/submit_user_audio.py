from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from src.application.conversation_orchestrator import (
    ConversationOrchestrator,
    TranscribeUserAudioCommand,
)
from src.domain.models.practice_session import PracticeSession
from src.domain.models.user import User
from src.schemas.practice import SubmitUserTurnResponse


@dataclass(frozen=True)
class SubmitUserAudioCommand:
    user: User
    session: PracticeSession
    client_turn_id: str
    audio_bytes: bytes
    mime_type: str
    duration_ms: int
    filename: str | None = None


def submit_user_audio(db: Session, command: SubmitUserAudioCommand) -> SubmitUserTurnResponse:
    return ConversationOrchestrator(db).transcribe_user_audio(
        TranscribeUserAudioCommand(
            user=command.user,
            session=command.session,
            client_turn_id=command.client_turn_id,
            audio_bytes=command.audio_bytes,
            mime_type=command.mime_type,
            duration_ms=command.duration_ms,
            filename=command.filename,
        )
    )
