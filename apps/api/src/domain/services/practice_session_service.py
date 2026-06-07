from __future__ import annotations

from fastapi import status
from sqlalchemy.orm import Session

from src.config import get_settings
from src.domain.models.practice_session import PracticeSession
from src.domain.models.user import User
from src.infrastructure.repositories.conversation_turn_repository import (
    ConversationTurnRepository,
)
from src.infrastructure.repositories.practice_session_repository import (
    PracticeSessionRepository,
)
from src.infrastructure.repositories.scenario_repository import ScenarioRepository
from src.schemas.errors import ApiError
from src.schemas.practice import (
    ConversationTurnResponse,
    CreatePracticeSessionResponse,
    DiscardTurnResponse,
    OpeningMessageResponse,
    PracticeSessionDetailResponse,
    SessionScenarioResponse,
)
from src.utils.time import utc_day_start


class PracticeSessionService:
    def __init__(self, db: Session):
        self.db = db
        self.sessions = PracticeSessionRepository(db)
        self.scenarios = ScenarioRepository(db)
        self.turns = ConversationTurnRepository(db)

    def create_session(
        self,
        *,
        user: User,
        scenario_slug: str,
    ) -> CreatePracticeSessionResponse:
        scenario = self.scenarios.get_by_slug(scenario_slug)
        if scenario is None:
            raise ApiError("SCENARIO_NOT_FOUND", "场景不存在。", status.HTTP_404_NOT_FOUND)

        if self.sessions.get_in_progress_for_user(user.id) is not None:
            raise ApiError(
                "SESSION_ALREADY_IN_PROGRESS",
                "请先结束当前练习。",
                status.HTTP_409_CONFLICT,
            )

        settings = get_settings()
        if (
            self.sessions.count_created_since(user.id, utc_day_start())
            >= settings.max_daily_sessions_per_user
        ):
            raise ApiError("RATE_LIMITED", "今日练习次数已达上限。", status.HTTP_429_TOO_MANY_REQUESTS)

        session = self.sessions.create(user_id=user.id, scenario_slug=scenario.slug)
        self.db.flush()
        opening_turn = self.turns.create_ai_opening_turn(
            session_id=session.id,
            text=scenario.opening_message,
        )
        self.db.commit()
        self.db.refresh(session)
        self.db.refresh(opening_turn)

        return CreatePracticeSessionResponse(
            id=session.id,
            status=session.status,
            scenario=SessionScenarioResponse(slug=scenario.slug, name=scenario.name),
            current_step_no=session.current_step_no,
            opening_message=OpeningMessageResponse(
                turn_id=opening_turn.id,
                text=opening_turn.content_text,
                audio_url=None,
                audio_mime_type=None,
            ),
            events_url=f"/api/v1/practice-sessions/{session.id}/events",
        )

    def get_session_detail(
        self,
        session: PracticeSession,
    ) -> PracticeSessionDetailResponse:
        turns = self.turns.list_by_session(session.id)
        return PracticeSessionDetailResponse(
            id=session.id,
            status=session.status,
            scenario=SessionScenarioResponse(
                slug=session.scenario.slug,
                name=session.scenario.name,
            ),
            current_step_no=session.current_step_no,
            started_at=session.created_at,
            ended_at=session.ended_at,
            turns=[
                ConversationTurnResponse(
                    id=turn.id,
                    turn_index=turn.turn_index,
                    speaker=turn.speaker,
                    transcript=turn.content_text,
                    asr_confidence=(
                        float(turn.asr_confidence)
                        if turn.asr_confidence is not None
                        else None
                    ),
                    audio_url=None,
                )
                for turn in turns
            ],
        )

    def discard_user_turn(
        self,
        *,
        session: PracticeSession,
        turn_id: str,
    ) -> DiscardTurnResponse:
        if session.status != "in_progress":
            raise ApiError(
                "SESSION_NOT_IN_PROGRESS",
                "当前练习已结束。",
                status.HTTP_409_CONFLICT,
            )

        turn = self.turns.get_by_id_for_session(session.id, turn_id)
        if turn is None or turn.speaker != "user":
            raise ApiError("TURN_NOT_FOUND", "识别结果不存在。", status.HTTP_404_NOT_FOUND)

        if turn.status != "pending":
            raise ApiError("TURN_NOT_PENDING", "当前识别结果不可重说。", status.HTTP_409_CONFLICT)

        self.turns.mark_user_turn_discarded(turn)
        self.db.commit()
        return DiscardTurnResponse(status="discarded")
