from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class AsrResult:
    transcript: str
    confidence: float
    word_confidences: list[float] = field(default_factory=list)
    speech_rate_wpm: int = 0
    pause_count: int = 0
    duration_ms: int = 0


@dataclass(frozen=True)
class LlmReplyResult:
    text: str
    raw_provider_response: dict | None = None


@dataclass(frozen=True)
class TtsResult:
    audio_bytes: bytes
    mime_type: str
    duration_ms: int = 0


@dataclass(frozen=True)
class LlmReplyContext:
    scenario_slug: str
    turn_index: int
    system_prompt: str
    messages: list[dict[str, str]]
