from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.models.assessment_report import AssessmentReport
from src.utils.id import generate_uuid


class ReportRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, report_id: str) -> AssessmentReport | None:
        stmt = select(AssessmentReport).where(
            AssessmentReport.id == report_id,
            AssessmentReport.deleted_at.is_(None),
        )
        return self.db.scalar(stmt)

    def get_by_session_id(self, session_id: str) -> AssessmentReport | None:
        stmt = select(AssessmentReport).where(
            AssessmentReport.session_id == session_id,
            AssessmentReport.deleted_at.is_(None),
        )
        return self.db.scalar(stmt)

    def create_pending(self, session_id: str, *, report_id: str | None = None) -> AssessmentReport:
        report = AssessmentReport(
            id=report_id or generate_uuid(),
            session_id=session_id,
            status="pending",
        )
        self.db.add(report)
        return report
