from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile

from src.api.deps import DbSession, get_current_user, require_session_owner
from src.application.use_cases.confirm_user_turn import (
    ConfirmUserTurnCommand,
    confirm_user_turn,
)
from src.application.use_cases.discard_user_turn import (
    DiscardUserTurnCommand,
    discard_user_turn,
)
from src.application.use_cases.submit_user_audio import (
    SubmitUserAudioCommand,
    submit_user_audio,
)
from src.domain.models.practice_session import PracticeSession
from src.domain.models.user import User
from src.schemas.practice import (
    ConfirmTurnRequest,
    ConfirmTurnResponse,
    DiscardTurnResponse,
    SubmitUserTurnResponse,
)

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


@router.post("/{id}/turns/{turn_id}/confirm", response_model=ConfirmTurnResponse)
def confirm_turn(
    turn_id: str,
    payload: ConfirmTurnRequest,
    db: DbSession,
    owned_session: Annotated[PracticeSession, Depends(require_session_owner)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ConfirmTurnResponse:
    return confirm_user_turn(
        db,
        ConfirmUserTurnCommand(
            user=current_user,
            session=owned_session,
            turn_id=turn_id,
            accepted=payload.accepted,
        ),
    )


@router.post("/{id}/turns/{turn_id}/discard", response_model=DiscardTurnResponse)
def discard_turn(
    turn_id: str,
    db: DbSession,
    owned_session: Annotated[PracticeSession, Depends(require_session_owner)],
) -> DiscardTurnResponse:
    return discard_user_turn(
        db,
        DiscardUserTurnCommand(
            session=owned_session,
            turn_id=turn_id,
        ),
    )
