from __future__ import annotations

from pydantic import BaseModel, Field


class FeedbackItemSchema(BaseModel):
    type: str = Field(min_length=1, max_length=32)
    explanation: str = Field(min_length=1)
    practice_text: str = Field(min_length=1)
    original_text: str | None = None
    suggestion_text: str | None = None


class ReportSchema(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    pronunciation_score: int = Field(ge=0, le=100)
    fluency_score: int = Field(ge=0, le=100)
    grammar_score: int = Field(ge=0, le=100)
    expression_score: int = Field(ge=0, le=100)
    level_description: str = Field(min_length=1, max_length=128)
    one_sentence_summary: str = Field(min_length=1)
    feedback_items: list[FeedbackItemSchema] = Field(min_length=2, max_length=10)
