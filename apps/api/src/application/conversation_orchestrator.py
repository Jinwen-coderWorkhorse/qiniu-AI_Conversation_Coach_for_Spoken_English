from __future__ import annotations

import io
from dataclasses import dataclass

from fastapi import status
from sqlalchemy.orm import Session

from src.domain.models.practice_session import PracticeSession
from src.domain.models.user import User
from src.config import get_settings
from src.domain.services.media_service import MediaService
from src.infrastructure.providers.asr_client import get_asr_client, transcribe_with_retry
from src.infrastructure.providers.errors import ProviderError
from src.infrastructure.repositories.conversation_turn_repository import (
    ConversationTurnRepository,
)
from src.schemas.errors import ApiError
from src.schemas.practice import SubmitUserTurnResponse, UserTurnMetricsResponse, UserTurnResponse
from src.utils.id import generate_uuid
from src.utils.time import utc_day_start

LOW_CONFIDENCE_THRESHOLD = 0.65
LOW_CONFIDENCE_HINT = "识别不太确定，建议重说一次。"


@dataclass(frozen=True)
class TranscribeUserAudioCommand:
    user: User
    session: PracticeSession
    client_turn_id: str
    audio_bytes: bytes
    mime_type: str
    duration_ms: int
    filename: str | None = None


class ConversationOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        self.turns = ConversationTurnRepository(db)
        self.media = MediaService()

    def transcribe_user_audio(self, command: TranscribeUserAudioCommand) -> SubmitUserTurnResponse:
        if command.session.status != "in_progress":
            raise ApiError(
                "SESSION_NOT_IN_PROGRESS",
                "当前练习已结束。",
                status.HTTP_409_CONFLICT,
            )

        existing = self.turns.get_by_client_turn_id(
            command.session.id,
            command.client_turn_id,
        )
        if existing is not None:
            return self._to_response(existing)

        settings = get_settings()
        if (
            self.turns.count_user_turns_created_since(command.user.id, utc_day_start())
            >= settings.max_daily_user_turns_per_user
        ):
            raise ApiError(
                "RATE_LIMITED",
                "今日练习轮次已达上限。",
                status.HTTP_429_TOO_MANY_REQUESTS,
            )

        self.media.validate_user_audio(
            content=command.audio_bytes,
            mime_type=command.mime_type,
            duration_ms=command.duration_ms,
        )

        turn_id = generate_uuid()
        object_key = self.media.save_user_audio(
            user_id=command.user.id,
            session_id=command.session.id,
            turn_id=turn_id,
            content=command.audio_bytes,
            mime_type=command.mime_type,
        )

        try:
            asr_result = transcribe_with_retry(
                get_asr_client(),
                io.BytesIO(command.audio_bytes),
                command.mime_type,
                filename=command.filename,
                duration_ms=command.duration_ms,
            )
        except ProviderError as exc:
            raise ApiError("ASR_FAILED", "识别失败，请重试。", status.HTTP_502_BAD_GATEWAY) from exc

        word_count = len(asr_result.transcript.split())
        metrics = {
            "duration_ms": command.duration_ms,
            "word_count": word_count,
            "speech_rate_wpm": asr_result.speech_rate_wpm,
            "pause_count": asr_result.pause_count,
        }
        if asr_result.confidence < LOW_CONFIDENCE_THRESHOLD:
            metrics["low_confidence"] = True

        turn = self.turns.create_pending_user_turn(
            turn_id=turn_id,
            session_id=command.session.id,
            turn_index=self.turns.get_next_turn_index(command.session.id),
            step_no=command.session.current_step_no,
            client_turn_id=command.client_turn_id,
            content_text=asr_result.transcript,
            asr_confidence=asr_result.confidence,
            asr_metrics_json=metrics,
            audio_object_key=object_key,
            audio_mime_type=command.mime_type,
            audio_duration_ms=command.duration_ms,
        )
        self.db.commit()
        self.db.refresh(turn)
        return self._to_response(turn)

    def _to_response(self, turn) -> SubmitUserTurnResponse:
        metrics_data = turn.asr_metrics_json or {}
        needs_retry = (
            turn.asr_confidence is not None
            and float(turn.asr_confidence) < LOW_CONFIDENCE_THRESHOLD
        )
        metrics = None
        if metrics_data:
            metrics = UserTurnMetricsResponse(
                duration_ms=metrics_data.get("duration_ms", turn.audio_duration_ms or 0),
                word_count=metrics_data.get("word_count", 0),
                speech_rate_wpm=metrics_data.get("speech_rate_wpm", 0),
                pause_count=metrics_data.get("pause_count", 0),
            )

        response = SubmitUserTurnResponse(
            turn=UserTurnResponse(
                id=turn.id,
                turn_index=turn.turn_index,
                speaker=turn.speaker,
                transcript=turn.content_text,
                asr_confidence=float(turn.asr_confidence) if turn.asr_confidence else None,
                needs_retry=needs_retry,
                metrics=metrics,
            ),
            hint=LOW_CONFIDENCE_HINT if needs_retry else None,
        )
        return response
