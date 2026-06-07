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
from src.infrastructure.providers.llm_client import generate_reply_with_retry, get_llm_client
from src.infrastructure.providers.tts_client import get_tts_client, synthesize_with_retry
from src.infrastructure.providers.types import LlmReplyContext
from src.infrastructure.repositories.conversation_turn_repository import (
    ConversationTurnRepository,
)
from src.infrastructure.repositories.practice_session_repository import (
    PracticeSessionRepository,
)
from src.schemas.errors import ApiError
from src.schemas.practice import (
    AiTurnResponse,
    ConfirmTurnResponse,
    SubmitUserTurnResponse,
    UserTurnMetricsResponse,
    UserTurnResponse,
)
from src.utils.id import generate_uuid
from src.utils.time import utc_day_start

LOW_CONFIDENCE_THRESHOLD = 0.65
LOW_CONFIDENCE_HINT = "识别不太确定，建议重说一次。"

LLM_FALLBACK_REPLIES: dict[str, str] = {
    "interview": "Could you tell me a bit more about that?",
    "restaurant": "Would you like anything else today?",
    "meeting": "What would you suggest as the next step?",
}


@dataclass(frozen=True)
class TranscribeUserAudioCommand:
    user: User
    session: PracticeSession
    client_turn_id: str
    audio_bytes: bytes
    mime_type: str
    duration_ms: int
    filename: str | None = None


@dataclass(frozen=True)
class GenerateAiReplyCommand:
    user: User
    session: PracticeSession
    user_turn_id: str


class ConversationOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        self.turns = ConversationTurnRepository(db)
        self.sessions = PracticeSessionRepository(db)
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

    def generate_ai_reply(self, command: GenerateAiReplyCommand) -> ConfirmTurnResponse:
        if command.session.status != "in_progress":
            raise ApiError(
                "SESSION_NOT_IN_PROGRESS",
                "当前练习已结束。",
                status.HTTP_409_CONFLICT,
            )

        user_turn = self.turns.get_by_id_for_session(command.session.id, command.user_turn_id)
        if user_turn is None or user_turn.speaker != "user":
            raise ApiError("TURN_NOT_FOUND", "识别结果不存在。", status.HTTP_404_NOT_FOUND)

        if user_turn.status == "confirmed":
            existing_ai = self.turns.get_ai_turn_after(command.session.id, user_turn.turn_index)
            if existing_ai is None:
                raise ApiError("TURN_NOT_PENDING", "该识别结果已处理。", status.HTTP_409_CONFLICT)
            return self._to_confirm_response(command.session, user_turn, existing_ai)

        if user_turn.status != "pending":
            raise ApiError("TURN_NOT_PENDING", "该识别结果已处理。", status.HTTP_409_CONFLICT)

        self.turns.mark_user_turn_confirmed(user_turn)
        self.db.flush()

        scenario = command.session.scenario
        context_turns = self.turns.list_confirmed_for_context(command.session.id)
        messages = [
            {"speaker": turn.speaker, "text": turn.content_text}
            for turn in context_turns
        ]

        try:
            llm_result = generate_reply_with_retry(
                get_llm_client(),
                LlmReplyContext(
                    scenario_slug=scenario.slug,
                    turn_index=user_turn.turn_index,
                    system_prompt=scenario.system_prompt,
                    messages=messages,
                ),
            )
            ai_text = llm_result.text
        except ProviderError as exc:
            fallback = LLM_FALLBACK_REPLIES.get(scenario.slug)
            if not fallback:
                raise ApiError(
                    "LLM_FAILED",
                    "AI 回复失败，请重试。",
                    status.HTTP_502_BAD_GATEWAY,
                ) from exc
            ai_text = fallback

        audio_object_key: str | None = None
        audio_mime_type: str | None = None
        audio_duration_ms: int | None = None
        audio_url: str | None = None

        try:
            tts_result = synthesize_with_retry(get_tts_client(), ai_text)
            if tts_result.audio_bytes:
                ai_turn_id = generate_uuid()
                audio_object_key = self.media.save_ai_audio(
                    user_id=command.user.id,
                    session_id=command.session.id,
                    turn_id=ai_turn_id,
                    content=tts_result.audio_bytes,
                    mime_type=tts_result.mime_type,
                    duration_ms=tts_result.duration_ms,
                )
                audio_mime_type = tts_result.mime_type
                audio_duration_ms = tts_result.duration_ms
                audio_url = self.media.build_audio_url(audio_object_key)
            else:
                ai_turn_id = generate_uuid()
        except ProviderError:
            ai_turn_id = generate_uuid()

        ai_turn = self.turns.create_confirmed_ai_turn(
            turn_id=ai_turn_id,
            session_id=command.session.id,
            turn_index=self.turns.get_next_turn_index(command.session.id),
            step_no=command.session.current_step_no,
            content_text=ai_text,
            audio_object_key=audio_object_key,
            audio_mime_type=audio_mime_type,
            audio_duration_ms=audio_duration_ms,
        )

        max_step_no = len(scenario.steps_json)
        next_step_no = min(command.session.current_step_no + 1, max_step_no)
        self.sessions.update_current_step_no(command.session, next_step_no)

        self.db.commit()
        self.db.refresh(command.session)
        self.db.refresh(ai_turn)
        return self._to_confirm_response(command.session, user_turn, ai_turn, audio_url=audio_url)

    def _to_confirm_response(
        self,
        session: PracticeSession,
        user_turn,
        ai_turn,
        *,
        audio_url: str | None = None,
    ) -> ConfirmTurnResponse:
        resolved_audio_url = audio_url
        if resolved_audio_url is None and ai_turn.audio_object_key:
            resolved_audio_url = self.media.build_audio_url(ai_turn.audio_object_key)

        return ConfirmTurnResponse(
            status="ai_reply_ready",
            user_turn_id=user_turn.id,
            ai_turn=AiTurnResponse(
                id=ai_turn.id,
                turn_index=ai_turn.turn_index,
                speaker=ai_turn.speaker,
                text=ai_turn.content_text,
                audio_url=resolved_audio_url,
                audio_mime_type=ai_turn.audio_mime_type,
            ),
            current_step_no=session.current_step_no,
        )

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
