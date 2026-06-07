from __future__ import annotations

from pydantic import BaseModel, Field


class EndPracticeSessionRequest(BaseModel):
    reason: str = Field(pattern="^(user_finished|timeout)$")


class EndPracticeSessionResponse(BaseModel):
    session_id: str
    status: str
    report_id: str


class ReportScoresResponse(BaseModel):
    pronunciation: int
    fluency: int
    grammar: int
    expression: int


class ReportOverviewResponse(BaseModel):
    overall_score: int
    level_description: str
    one_sentence_summary: str
    scores: ReportScoresResponse


class ReportItemResponse(BaseModel):
    id: str
    type: str
    explanation: str
    practice_text: str
    original_text: str | None = None
    suggestion_text: str | None = None


class ReportErrorResponse(BaseModel):
    code: str
    message: str


class ReportResponse(BaseModel):
    id: str
    session_id: str
    status: str
    overview: ReportOverviewResponse | None = None
    items: list[ReportItemResponse] | None = None
    error: ReportErrorResponse | None = None
