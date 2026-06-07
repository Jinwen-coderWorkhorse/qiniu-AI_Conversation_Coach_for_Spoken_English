from __future__ import annotations

from dataclasses import dataclass

from fastapi import status
from sqlalchemy.orm import Session

from src.domain.models.practice_session import PracticeSession
from src.infrastructure.queue.report_publisher import publish_report_job
from src.infrastructure.repositories.conversation_turn_repository import (
    ConversationTurnRepository,
)
from src.infrastructure.repositories.practice_session_repository import (
    PracticeSessionRepository,
)
from src.infrastructure.repositories.report_repository import ReportRepository
from src.schemas.errors import ApiError
from src.schemas.report import EndPracticeSessionResponse
from src.utils.time import utc_now


@dataclass(frozen=True)
class EndPracticeSessionCommand:
    session: PracticeSession
    reason: str


def end_practice_session(db: Session, command: EndPracticeSessionCommand) -> EndPracticeSessionResponse:
    sessions = PracticeSessionRepository(db)
    reports = ReportRepository(db)
    turns = ConversationTurnRepository(db)

    existing_report = reports.get_by_session_id(command.session.id)
    if command.session.status in {"reporting", "completed"} and existing_report is not None:
        return EndPracticeSessionResponse(
            session_id=command.session.id,
            status=command.session.status,
            report_id=existing_report.id,
        )

    if command.session.status != "in_progress":
        if existing_report is not None:
            return EndPracticeSessionResponse(
                session_id=command.session.id,
                status=command.session.status,
                report_id=existing_report.id,
            )
        raise ApiError("NOT_FOUND", "练习不存在。", status.HTTP_404_NOT_FOUND)

    if turns.count_confirmed_user_turns(command.session.id) == 0:
        raise ApiError(
            "CONFLICT",
            "暂无可生成报告的内容。",
            status.HTTP_409_CONFLICT,
        )

    sessions.mark_reporting(command.session, ended_at=utc_now())
    report = reports.create_pending(command.session.id)
    db.commit()
    db.refresh(command.session)
    db.refresh(report)

    publish_report_job(session_id=command.session.id, report_id=report.id)

    return EndPracticeSessionResponse(
        session_id=command.session.id,
        status="reporting",
        report_id=report.id,
    )
