from __future__ import annotations

import os
from typing import BinaryIO

from src.infrastructure.providers.types import (
    AsrResult,
    LlmReplyContext,
    LlmReplyResult,
    TtsResult,
)

DEFAULT_TRANSCRIPT = "My name is Alex. I worked on a shopping app."
LOW_CONFIDENCE_TRANSCRIPT = "I work ... shopping ..."
DEFAULT_CONFIDENCE = 0.91
LOW_CONFIDENCE = 0.52

MOCK_AI_REPLIES: dict[str, list[str]] = {
    "interview": [
        "Thanks, Alex. Could you tell me more about your role in that project?",
        "What was the biggest challenge you faced on that project?",
        "How did you measure success for that work?",
        "Do you have any questions for me about the team or role?",
    ],
    "restaurant": [
        "Great. Would you like to hear today's specials?",
        "We have grilled salmon and mushroom pasta. Which sounds better to you?",
        "Excellent choice. Would you like anything to drink with that?",
        "Of course. I will bring the bill in a moment.",
    ],
    "meeting": [
        "Thanks. Are there any blockers we should discuss?",
        "What support do you need to move this forward?",
        "That sounds reasonable. What should we do next?",
        "Can you confirm who owns the next action item?",
    ],
}

MOCK_REPORT: dict = {
    "overall_score": 76,
    "pronunciation_score": 78,
    "fluency_score": 70,
    "grammar_score": 76,
    "expression_score": 72,
    "level_description": "可以完成基本沟通",
    "one_sentence_summary": "你能回答主要问题，但句子还偏短。",
    "feedback_items": [
        {
            "type": "pronunciation",
            "explanation": "这轮回答识别置信度略低，建议放慢语速，并把 project 这类关键词说完整。",
            "practice_text": "I worked on a project about online shopping.",
        },
        {
            "type": "expression",
            "original_text": "I worked on a shopping app.",
            "suggestion_text": (
                "I worked on a shopping app, and I was responsible for the checkout flow."
            ),
            "explanation": "可以补充职责，让表达更完整。",
            "practice_text": (
                "I worked on a shopping app, and I was responsible for the checkout flow."
            ),
        },
    ],
}


def _should_use_low_confidence(*, filename: str | None) -> bool:
    if os.getenv("MOCK_ASR_LOW_CONFIDENCE", "").lower() in {"1", "true", "yes"}:
        return True
    if filename:
        lowered = filename.lower()
        return "low_confidence" in lowered or "low-confidence" in lowered
    return False


class MockAsrClient:
    def transcribe(
        self,
        audio_file: BinaryIO,
        mime_type: str,
        *,
        filename: str | None = None,
        duration_ms: int | None = None,
    ) -> AsrResult:
        del audio_file, mime_type

        low_confidence = _should_use_low_confidence(filename=filename)
        transcript = LOW_CONFIDENCE_TRANSCRIPT if low_confidence else DEFAULT_TRANSCRIPT
        confidence = LOW_CONFIDENCE if low_confidence else DEFAULT_CONFIDENCE
        effective_duration = duration_ms or 6200
        word_count = len(transcript.split())

        return AsrResult(
            transcript=transcript,
            confidence=confidence,
            word_confidences=[confidence] * max(word_count, 1),
            speech_rate_wpm=106,
            pause_count=2 if not low_confidence else 4,
            duration_ms=effective_duration,
        )


class MockLlmClient:
    def generate_reply(self, context: LlmReplyContext) -> LlmReplyResult:
        replies = MOCK_AI_REPLIES.get(context.scenario_slug, MOCK_AI_REPLIES["interview"])
        user_turn_count = sum(1 for message in context.messages if message.get("speaker") == "user")
        index = min(max(user_turn_count - 1, 0), len(replies) - 1)
        text = replies[index]
        return LlmReplyResult(
            text=text,
            raw_provider_response={"provider": "mock", "scenario": context.scenario_slug},
        )

    def generate_report(self, prompt: str, context: dict) -> dict:
        del prompt, context
        return dict(MOCK_REPORT)


class MockTtsClient:
    def synthesize(self, text: str, voice: str = "default") -> TtsResult:
        del text, voice
        has_audio = os.getenv("MOCK_TTS_HAS_AUDIO", "").lower() in {"1", "true", "yes"}
        return TtsResult(
            audio_bytes=b"MOCK_AUDIO" if has_audio else b"",
            mime_type="audio/mpeg",
            duration_ms=1500 if has_audio else 0,
        )
