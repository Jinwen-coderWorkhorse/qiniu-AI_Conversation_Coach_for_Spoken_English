from __future__ import annotations

from sqlalchemy import JSON, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class Scenario(TimestampMixin, Base):
    __tablename__ = "scenarios"

    slug: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    summary: Mapped[str] = mapped_column(String(512), nullable=False)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    user_role: Mapped[str] = mapped_column(String(64), nullable=False)
    ai_role: Mapped[str] = mapped_column(String(64), nullable=False)
    opening_message: Mapped[str] = mapped_column(Text, nullable=False)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    steps_json: Mapped[list[dict]] = mapped_column(JSON, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    sessions = relationship("PracticeSession", back_populates="scenario")
