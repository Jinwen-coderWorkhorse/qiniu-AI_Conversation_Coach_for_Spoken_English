from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CreatePracticeSessionRequest(BaseModel):
    scenario_slug: str = Field(min_length=1, max_length=64)


class SessionScenarioResponse(BaseModel):
    slug: str
    name: str


class OpeningMessageResponse(BaseModel):
    turn_id: str
    text: str
    audio_url: str | None = None
    audio_mime_type: str | None = None


class CreatePracticeSessionResponse(BaseModel):
    id: str
    status: str
    scenario: SessionScenarioResponse
    current_step_no: int
    opening_message: OpeningMessageResponse
    events_url: str


class ConversationTurnResponse(BaseModel):
    id: str
    turn_index: int
    speaker: str
    transcript: str
    asr_confidence: float | None = None
    audio_url: str | None = None


class PracticeSessionDetailResponse(BaseModel):
    id: str
    status: str
    scenario: SessionScenarioResponse
    current_step_no: int
    started_at: datetime
    ended_at: datetime | None = None
    turns: list[ConversationTurnResponse]


class UserTurnMetricsResponse(BaseModel):
    duration_ms: int
    word_count: int
    speech_rate_wpm: int
    pause_count: int


class UserTurnResponse(BaseModel):
    id: str
    turn_index: int
    speaker: str
    transcript: str
    asr_confidence: float | None = None
    needs_retry: bool = False
    metrics: UserTurnMetricsResponse | None = None


class SubmitUserTurnResponse(BaseModel):
    turn: UserTurnResponse
    hint: str | None = None


class ConfirmTurnRequest(BaseModel):
    accepted: bool


class AiTurnResponse(BaseModel):
    id: str
    turn_index: int
    speaker: str
    text: str
    audio_url: str | None = None
    audio_mime_type: str | None = None


class ConfirmTurnResponse(BaseModel):
    status: str
    user_turn_id: str
    ai_turn: AiTurnResponse
    current_step_no: int


class DiscardTurnResponse(BaseModel):
    status: str
