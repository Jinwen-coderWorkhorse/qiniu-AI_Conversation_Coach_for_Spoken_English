from __future__ import annotations

from fastapi import status
from sqlalchemy.orm import Session

from src.domain.models.assessment_report import AssessmentReport
from src.infrastructure.repositories.report_repository import ReportRepository
from src.schemas.errors import ApiError
from src.schemas.report import (
    ReportItemResponse,
    ReportOverviewResponse,
    ReportResponse,
    ReportScoresResponse,
    ReportErrorResponse,
)
from src.utils.id import generate_uuid


class ReportService:
    def __init__(self, db: Session):
        self.db = db
        self.reports = ReportRepository(db)

    def get_report_for_session(self, session_id: str) -> ReportResponse:
        report = self.reports.get_by_session_id(session_id)
        if report is None:
            raise ApiError("NOT_FOUND", "报告不存在。", status.HTTP_404_NOT_FOUND)
        return self._to_response(report)

    def _to_response(self, report: AssessmentReport) -> ReportResponse:
        if report.status == "pending":
            return ReportResponse(
                id=report.id,
                session_id=report.session_id,
                status="pending",
            )

        if report.status == "failed":
            return ReportResponse(
                id=report.id,
                session_id=report.session_id,
                status="failed",
                error=ReportErrorResponse(
                    code=report.error_code or "REPORT_FAILED",
                    message=report.error_message or "报告生成失败，可稍后重试。",
                ),
            )

        items = [
            ReportItemResponse(
                id=generate_uuid(),
                type=item["type"],
                explanation=item["explanation"],
                practice_text=item["practice_text"],
                original_text=item.get("original_text"),
                suggestion_text=item.get("suggestion_text"),
            )
            for item in (report.feedback_json or [])
        ]

        return ReportResponse(
            id=report.id,
            session_id=report.session_id,
            status="completed",
            overview=ReportOverviewResponse(
                overall_score=report.overall_score or 0,
                level_description=report.level_description or "",
                one_sentence_summary=report.one_sentence_summary or "",
                scores=ReportScoresResponse(
                    pronunciation=report.pronunciation_score or 0,
                    fluency=report.fluency_score or 0,
                    grammar=report.grammar_score or 0,
                    expression=report.expression_score or 0,
                ),
            ),
            items=items,
        )
