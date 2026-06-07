from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.domain.models.conversation_turn import ConversationTurn
from src.domain.models.practice_session import PracticeSession


class ConversationTurnRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_ai_opening_turn(self, session_id: str, text: str) -> ConversationTurn:
        turn = ConversationTurn(
            session_id=session_id,
            turn_index=1,
            speaker="ai",
            step_no=1,
            status="confirmed",
            content_text=text,
            audio_object_key=None,
            audio_mime_type=None,
            audio_duration_ms=None,
        )
        self.db.add(turn)
        return turn

    def list_by_session(self, session_id: str) -> list[ConversationTurn]:
        stmt = (
            select(ConversationTurn)
            .where(
                ConversationTurn.session_id == session_id,
                ConversationTurn.deleted_at.is_(None),
            )
            .order_by(ConversationTurn.turn_index.asc())
        )
        return list(self.db.scalars(stmt).all())

    def get_by_client_turn_id(
        self,
        session_id: str,
        client_turn_id: str,
    ) -> ConversationTurn | None:
        stmt = select(ConversationTurn).where(
            ConversationTurn.session_id == session_id,
            ConversationTurn.client_turn_id == client_turn_id,
            ConversationTurn.deleted_at.is_(None),
        )
        return self.db.scalar(stmt)

    def get_next_turn_index(self, session_id: str) -> int:
        stmt = select(func.max(ConversationTurn.turn_index)).where(
            ConversationTurn.session_id == session_id,
            ConversationTurn.deleted_at.is_(None),
        )
        current_max = self.db.scalar(stmt)
        return int(current_max or 0) + 1

    def create_pending_user_turn(
        self,
        *,
        turn_id: str,
        session_id: str,
        turn_index: int,
        step_no: int,
        client_turn_id: str,
        content_text: str,
        asr_confidence: float,
        asr_metrics_json: dict,
        audio_object_key: str,
        audio_mime_type: str,
        audio_duration_ms: int,
    ) -> ConversationTurn:
        turn = ConversationTurn(
            id=turn_id,
            session_id=session_id,
            turn_index=turn_index,
            speaker="user",
            step_no=step_no,
            status="pending",
            client_turn_id=client_turn_id,
            content_text=content_text,
            asr_confidence=Decimal(str(round(asr_confidence, 4))),
            asr_metrics_json=asr_metrics_json,
            audio_object_key=audio_object_key,
            audio_mime_type=audio_mime_type,
            audio_duration_ms=audio_duration_ms,
        )
        self.db.add(turn)
        return turn

    def get_by_id_for_session(self, session_id: str, turn_id: str) -> ConversationTurn | None:
        stmt = select(ConversationTurn).where(
            ConversationTurn.id == turn_id,
            ConversationTurn.session_id == session_id,
            ConversationTurn.deleted_at.is_(None),
        )
        return self.db.scalar(stmt)

    def get_ai_turn_after(self, session_id: str, user_turn_index: int) -> ConversationTurn | None:
        stmt = select(ConversationTurn).where(
            ConversationTurn.session_id == session_id,
            ConversationTurn.turn_index == user_turn_index + 1,
            ConversationTurn.speaker == "ai",
            ConversationTurn.deleted_at.is_(None),
        )
        return self.db.scalar(stmt)

    def list_confirmed_for_context(self, session_id: str) -> list[ConversationTurn]:
        stmt = (
            select(ConversationTurn)
            .where(
                ConversationTurn.session_id == session_id,
                ConversationTurn.status == "confirmed",
                ConversationTurn.deleted_at.is_(None),
            )
            .order_by(ConversationTurn.turn_index.asc())
        )
        return list(self.db.scalars(stmt).all())

    def mark_user_turn_confirmed(self, turn: ConversationTurn) -> ConversationTurn:
        turn.status = "confirmed"
        return turn

    def mark_user_turn_discarded(self, turn: ConversationTurn) -> ConversationTurn:
        turn.status = "discarded"
        return turn

    def create_confirmed_ai_turn(
        self,
        *,
        turn_id: str,
        session_id: str,
        turn_index: int,
        step_no: int,
        content_text: str,
        audio_object_key: str | None,
        audio_mime_type: str | None,
        audio_duration_ms: int | None,
    ) -> ConversationTurn:
        turn = ConversationTurn(
            id=turn_id,
            session_id=session_id,
            turn_index=turn_index,
            speaker="ai",
            step_no=step_no,
            status="confirmed",
            content_text=content_text,
            audio_object_key=audio_object_key,
            audio_mime_type=audio_mime_type,
            audio_duration_ms=audio_duration_ms,
        )
        self.db.add(turn)
        return turn

    def list_confirmed_user_turns(self, session_id: str) -> list[ConversationTurn]:
        stmt = (
            select(ConversationTurn)
            .where(
                ConversationTurn.session_id == session_id,
                ConversationTurn.speaker == "user",
                ConversationTurn.status == "confirmed",
                ConversationTurn.deleted_at.is_(None),
            )
            .order_by(ConversationTurn.turn_index.asc())
        )
        return list(self.db.scalars(stmt).all())

    def count_confirmed_user_turns(self, session_id: str) -> int:
        stmt = (
            select(func.count())
            .select_from(ConversationTurn)
            .where(
                ConversationTurn.session_id == session_id,
                ConversationTurn.speaker == "user",
                ConversationTurn.status == "confirmed",
                ConversationTurn.deleted_at.is_(None),
            )
        )
        return int(self.db.scalar(stmt) or 0)

    def count_user_turns_created_since(self, user_id: str, since: datetime) -> int:
        stmt = (
            select(func.count())
            .select_from(ConversationTurn)
            .join(PracticeSession, PracticeSession.id == ConversationTurn.session_id)
            .where(
                PracticeSession.user_id == user_id,
                ConversationTurn.speaker == "user",
                ConversationTurn.created_at >= since,
                ConversationTurn.deleted_at.is_(None),
                PracticeSession.deleted_at.is_(None),
            )
        )
        return int(self.db.scalar(stmt) or 0)
