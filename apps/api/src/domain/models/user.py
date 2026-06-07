from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin
from src.utils.id import generate_uuid


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    anonymous_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    anonymous_secret_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    sessions = relationship("PracticeSession", back_populates="user")
