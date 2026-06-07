from __future__ import annotations

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin
from src.utils.id import generate_uuid


class PracticeSession(TimestampMixin, Base):
    __tablename__ = "practice_sessions"
    __table_args__ = (
        Index("idx_practice_sessions_user_created", "user_id", "created_at"),
        Index("idx_practice_sessions_status_updated", "status", "updated_at"),
        Index("idx_practice_sessions_user_status", "user_id", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )
    scenario_slug: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("scenarios.slug"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="in_progress")
    current_step_no: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    ended_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="sessions")
    scenario = relationship("Scenario", back_populates="sessions")
    turns = relationship("ConversationTurn", back_populates="session")
    report = relationship("AssessmentReport", back_populates="session", uselist=False)
