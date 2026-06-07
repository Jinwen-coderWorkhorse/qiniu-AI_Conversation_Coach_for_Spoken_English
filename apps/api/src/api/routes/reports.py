from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from src.api.deps import DbSession, require_session_owner
from src.domain.models.practice_session import PracticeSession
from src.domain.services.report_service import ReportService
from src.schemas.report import ReportResponse

router = APIRouter(prefix="/practice-sessions", tags=["Report"])


@router.get("/{id}/report", response_model=ReportResponse)
def get_practice_report(
    db: DbSession,
    owned_session: Annotated[PracticeSession, Depends(require_session_owner)],
) -> ReportResponse:
    return ReportService(db).get_report_for_session(owned_session.id)
