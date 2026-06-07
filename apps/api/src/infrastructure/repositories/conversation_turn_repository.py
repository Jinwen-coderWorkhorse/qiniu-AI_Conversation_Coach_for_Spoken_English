from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.models.conversation_turn import ConversationTurn


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
