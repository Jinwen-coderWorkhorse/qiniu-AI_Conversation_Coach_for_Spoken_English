from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile

from src.api.deps import DbSession, get_current_user, require_session_owner
from src.application.use_cases.submit_user_audio import (
    SubmitUserAudioCommand,
    submit_user_audio,
)
from src.domain.models.practice_session import PracticeSession
from src.domain.models.user import User
from src.schemas.practice import SubmitUserTurnResponse

router = APIRouter(prefix="/practice-sessions", tags=["PracticeTurn"])


@router.post("/{id}/user-turns", response_model=SubmitUserTurnResponse)
async def submit_user_turn(
    db: DbSession,
    owned_session: Annotated[PracticeSession, Depends(require_session_owner)],
    current_user: Annotated[User, Depends(get_current_user)],
    audio: Annotated[UploadFile, File()],
    client_turn_id: Annotated[str, Form()],
    duration_ms: Annotated[int, Form()],
    mime_type: Annotated[str, Form()],
) -> SubmitUserTurnResponse:
    content = await audio.read()
    return submit_user_audio(
        db,
        SubmitUserAudioCommand(
            user=current_user,
            session=owned_session,
            client_turn_id=client_turn_id,
            audio_bytes=content,
            mime_type=mime_type,
            duration_ms=duration_ms,
            filename=audio.filename,
        ),
    )
