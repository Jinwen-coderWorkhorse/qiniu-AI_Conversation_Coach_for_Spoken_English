from __future__ import annotations

from pydantic import ValidationError

from src.domain.services.assessment_service import AssessmentService
from src.infrastructure.db import get_sessionmaker
from src.infrastructure.repositories.practice_session_repository import (
    PracticeSessionRepository,
)
from src.infrastructure.repositories.report_repository import ReportRepository


def generate_report(*, session_id: str, report_id: str) -> None:
    session_factory = get_sessionmaker()
    with session_factory() as db:
        reports = ReportRepository(db)
        sessions = PracticeSessionRepository(db)
        assessment = AssessmentService(db)

        report = reports.get_by_id(report_id)
        if report is None or report.session_id != session_id:
            return
        if report.status != "pending":
            return

        session = sessions.get_by_id(session_id)
        if session is None:
            return

        try:
            payload = assessment.build_report_payload(session_id)
            assessment.apply_completed_report(report, payload)
            sessions.mark_completed(session)
        except (ValidationError, RuntimeError, ValueError):
            assessment.apply_failed_report(
                report,
                error_code="REPORT_FAILED",
                error_message="报告生成失败，可稍后重试。",
            )

        db.commit()
