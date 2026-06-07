from __future__ import annotations

from sqlalchemy import ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin
from src.utils.id import generate_uuid


class AssessmentReport(TimestampMixin, Base):
    __tablename__ = "assessment_reports"
    __table_args__ = (
        UniqueConstraint("session_id", name="uk_assessment_reports_session"),
        Index("idx_assessment_reports_status_updated", "status", "updated_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("practice_sessions.id"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    overall_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pronunciation_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fluency_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    grammar_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expression_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    level_description: Mapped[str | None] = mapped_column(String(128), nullable=True)
    one_sentence_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    feedback_json: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(512), nullable=True)

    session = relationship("PracticeSession", back_populates="report")
