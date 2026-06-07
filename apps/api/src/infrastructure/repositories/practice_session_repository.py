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

    def update_current_step_no(self, session: PracticeSession, step_no: int) -> PracticeSession:
        session.current_step_no = step_no
        return session

    def mark_reporting(self, session: PracticeSession, *, ended_at) -> PracticeSession:
        session.status = "reporting"
        session.ended_at = ended_at
        return session

    def mark_completed(self, session: PracticeSession) -> PracticeSession:
        session.status = "completed"
        return session

    def count_created_since(self, user_id: str, since: datetime) -> int:
        stmt = select(func.count()).select_from(PracticeSession).where(
            PracticeSession.user_id == user_id,
            PracticeSession.created_at >= since,
            PracticeSession.deleted_at.is_(None),
        )
        return int(self.db.scalar(stmt) or 0)

    def list_completed_history(
        self,
        user_id: str,
        *,
        page: int,
        page_size: int,
        scenario_slug: str | None = None,
    ) -> tuple[list[PracticeSession], int]:
        filters = [
            PracticeSession.user_id == user_id,
            PracticeSession.status == "completed",
            PracticeSession.deleted_at.is_(None),
        ]
        if scenario_slug:
            filters.append(PracticeSession.scenario_slug == scenario_slug)

        count_stmt = select(func.count()).select_from(PracticeSession).where(*filters)
        total = int(self.db.scalar(count_stmt) or 0)

        stmt = (
            select(PracticeSession)
            .options(
                selectinload(PracticeSession.scenario),
                selectinload(PracticeSession.report),
            )
            .where(*filters)
            .order_by(PracticeSession.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.db.scalars(stmt).all()), total

    def count_completed_for_user(self, user_id: str) -> int:
        stmt = select(func.count()).select_from(PracticeSession).where(
            PracticeSession.user_id == user_id,
            PracticeSession.status == "completed",
            PracticeSession.deleted_at.is_(None),
        )
        return int(self.db.scalar(stmt) or 0)
