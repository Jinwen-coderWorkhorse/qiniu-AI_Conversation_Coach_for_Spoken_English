from __future__ import annotations

from sqlalchemy.orm import Session

from src.domain.models.assessment_report import AssessmentReport
from src.infrastructure.providers.errors import ProviderError
from src.infrastructure.providers.llm_client import generate_report_with_retry, get_llm_client
from src.infrastructure.repositories.conversation_turn_repository import (
    ConversationTurnRepository,
)
from src.schemas.report_schema import ReportSchema

LOW_CONFIDENCE_EXCLUDE_THRESHOLD = 0.65
LOW_CONFIDENCE_DOWNWEIGHT_THRESHOLD = 0.8


class AssessmentService:
    def __init__(self, db: Session):
        self.db = db
        self.turns = ConversationTurnRepository(db)

    def build_report_payload(self, session_id: str) -> ReportSchema:
        user_turns = self.turns.list_confirmed_user_turns(session_id)
        scorable_turns = [
            turn
            for turn in user_turns
            if turn.asr_confidence is None
            or float(turn.asr_confidence) >= LOW_CONFIDENCE_EXCLUDE_THRESHOLD
        ]
        context = {
            "session_id": session_id,
            "user_turn_count": len(user_turns),
            "scorable_turn_count": len(scorable_turns),
            "has_low_confidence_turns": any(
                turn.asr_confidence is not None
                and LOW_CONFIDENCE_EXCLUDE_THRESHOLD
                <= float(turn.asr_confidence)
                < LOW_CONFIDENCE_DOWNWEIGHT_THRESHOLD
                for turn in user_turns
            ),
            "turns": [
                {
                    "transcript": turn.content_text,
                    "asr_confidence": (
                        float(turn.asr_confidence) if turn.asr_confidence is not None else None
                    ),
                }
                for turn in user_turns
            ],
        }

        try:
            raw_report = generate_report_with_retry(
                get_llm_client(),
                "Generate structured English practice report JSON.",
                context,
            )
        except ProviderError as exc:
            raise RuntimeError("REPORT_GENERATION_FAILED") from exc

        report = ReportSchema.model_validate(raw_report)
        if context["has_low_confidence_turns"]:
            report = report.model_copy(
                update={
                    "overall_score": max(report.overall_score - 4, 0),
                    "pronunciation_score": max(report.pronunciation_score - 5, 0),
                }
            )
        return report

    def apply_completed_report(self, report: AssessmentReport, payload: ReportSchema) -> AssessmentReport:
        report.status = "completed"
        report.overall_score = payload.overall_score
        report.pronunciation_score = payload.pronunciation_score
        report.fluency_score = payload.fluency_score
        report.grammar_score = payload.grammar_score
        report.expression_score = payload.expression_score
        report.level_description = payload.level_description
        report.one_sentence_summary = payload.one_sentence_summary
        report.feedback_json = [item.model_dump() for item in payload.feedback_items]
        report.error_code = None
        report.error_message = None
        return report

    def apply_failed_report(
        self,
        report: AssessmentReport,
        *,
        error_code: str,
        error_message: str,
    ) -> AssessmentReport:
        report.status = "failed"
        report.error_code = error_code
        report.error_message = error_message
        return report
