from __future__ import annotations

from sqlalchemy.orm import Session

from src.domain.models.user import User
from src.infrastructure.repositories.conversation_turn_repository import (
    ConversationTurnRepository,
)
from src.infrastructure.repositories.practice_session_repository import (
    PracticeSessionRepository,
)
from src.infrastructure.repositories.report_repository import ReportRepository
from src.schemas.history import (
    HistoryListResponse,
    HistorySessionItemResponse,
    MeStatsResponse,
    PaginationResponse,
    ScoreTrendItemResponse,
)


class HistoryService:
    def __init__(self, db: Session):
        self.db = db
        self.sessions = PracticeSessionRepository(db)
        self.turns = ConversationTurnRepository(db)
        self.reports = ReportRepository(db)

    def list_history(
        self,
        user: User,
        *,
        page: int,
        page_size: int,
        scenario_slug: str | None = None,
    ) -> HistoryListResponse:
        session_rows, total = self.sessions.list_completed_history(
            user.id,
            page=page,
            page_size=page_size,
            scenario_slug=scenario_slug,
        )
        items = [
            HistorySessionItemResponse(
                id=session.id,
                scenario_name=session.scenario.name,
                created_at=session.created_at,
                duration_sec=self._duration_sec(session),
                overall_score=(
                    session.report.overall_score
                    if session.report and session.report.status == "completed"
                    else None
                ),
                level_description=(
                    session.report.level_description
                    if session.report and session.report.status == "completed"
                    else None
                ),
            )
            for session in session_rows
        ]
        return HistoryListResponse(
            items=items,
            pagination=PaginationResponse(
                page=page,
                page_size=page_size,
                total=total,
            ),
        )

    def get_stats(self, user: User) -> MeStatsResponse:
        practice_count = self.sessions.count_completed_for_user(user.id)
        duration_ms, word_count = self.turns.aggregate_confirmed_user_stats(user.id)
        score_rows = self.reports.list_completed_scores_for_user(user.id)

        average_score = None
        if score_rows:
            average_score = round(sum(score for _, score in score_rows) / len(score_rows))

        score_trend = [
            ScoreTrendItemResponse(
                date=created_at.date().isoformat(),
                score=score,
            )
            for created_at, score in score_rows
        ]

        return MeStatsResponse(
            practice_count=practice_count,
            spoken_minutes=max(duration_ms // 60000, 0),
            user_word_count=word_count,
            average_score=average_score,
            score_trend=score_trend,
        )

    @staticmethod
    def _duration_sec(session) -> int:
        if session.ended_at is not None and session.created_at is not None:
            return max(int((session.ended_at - session.created_at).total_seconds()), 0)
        return 0
