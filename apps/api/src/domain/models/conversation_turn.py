from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Integer, JSON, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin
from src.utils.id import generate_uuid


class ConversationTurn(TimestampMixin, Base):
    __tablename__ = "conversation_turns"
    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "turn_index",
            name="uk_conversation_turns_session_turn_index",
        ),
        UniqueConstraint(
            "session_id",
            "client_turn_id",
            name="uk_conversation_turns_session_client_turn",
        ),
        Index("idx_conversation_turns_session_speaker", "session_id", "speaker"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("practice_sessions.id"),
        nullable=False,
    )
    turn_index: Mapped[int] = mapped_column(Integer, nullable=False)
    speaker: Mapped[str] = mapped_column(String(16), nullable=False)
    step_no: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    client_turn_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    asr_confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    asr_metrics_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    audio_object_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    audio_mime_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    audio_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    session = relationship("PracticeSession", back_populates="turns")
