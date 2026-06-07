from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from src.domain.models.practice_session import PracticeSession


class PracticeSessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: str, scenario_slug: str) -> PracticeSession:
        session = PracticeSession(user_id=user_id, scenario_slug=scenario_slug)
        self.db.add(session)
        return session

    def get_by_id(self, session_id: str) -> PracticeSession | None:
        stmt = (
            select(PracticeSession)
            .options(
                selectinload(PracticeSession.scenario),
                selectinload(PracticeSession.turns),
            )
            .where(
                PracticeSession.id == session_id,
                PracticeSession.deleted_at.is_(None),
            )
        )
        return self.db.scalar(stmt)

    def get_in_progress_for_user(self, user_id: str) -> PracticeSession | None:
        stmt = select(PracticeSession).where(
            PracticeSession.user_id == user_id,
            PracticeSession.status == "in_progress",
            PracticeSession.deleted_at.is_(None),
        )
        return self.db.scalar(stmt)

    def count_created_since(self, user_id: str, since: datetime) -> int:
        stmt = select(func.count()).select_from(PracticeSession).where(
            PracticeSession.user_id == user_id,
            PracticeSession.created_at >= since,
            PracticeSession.deleted_at.is_(None),
        )
        return int(self.db.scalar(stmt) or 0)
