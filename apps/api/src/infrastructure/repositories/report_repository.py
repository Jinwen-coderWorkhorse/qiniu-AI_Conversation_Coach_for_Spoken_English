from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.models.assessment_report import AssessmentReport


class ReportRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_session_id(self, session_id: str) -> AssessmentReport | None:
        stmt = select(AssessmentReport).where(
            AssessmentReport.session_id == session_id,
            AssessmentReport.deleted_at.is_(None),
        )
        return self.db.scalar(stmt)
