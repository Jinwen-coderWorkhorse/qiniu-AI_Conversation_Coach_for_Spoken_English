from __future__ import annotations

import io

import pytest

from src.infrastructure.providers.asr_client import get_asr_client, transcribe_with_retry
from src.infrastructure.providers.llm_client import (
    generate_reply_with_retry,
    generate_report_with_retry,
    get_llm_client,
)
from src.infrastructure.providers.mock_provider import (
    DEFAULT_CONFIDENCE,
    DEFAULT_TRANSCRIPT,
    LOW_CONFIDENCE,
    LOW_CONFIDENCE_TRANSCRIPT,
)
from src.infrastructure.providers.tts_client import get_tts_client, synthesize_with_retry
from src.infrastructure.providers.types import LlmReplyContext


@pytest.fixture(autouse=True)
def mock_provider_env(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "mock")
    monkeypatch.delenv("MOCK_ASR_LOW_CONFIDENCE", raising=False)
    monkeypatch.delenv("MOCK_TTS_HAS_AUDIO", raising=False)
    get_settings_cache = __import__("src.config", fromlist=["get_settings"]).get_settings
    get_settings_cache.cache_clear()


def test_factory_returns_mock_clients():
    assert get_asr_client().__class__.__name__ == "MockAsrClient"
    assert get_llm_client().__class__.__name__ == "MockLlmClient"
    assert get_tts_client().__class__.__name__ == "MockTtsClient"


def test_mock_asr_default_result():
    client = get_asr_client()
    result = transcribe_with_retry(
        client,
        io.BytesIO(b"fake-audio"),
        "audio/webm",
        filename="recording.webm",
        duration_ms=6200,
    )

    assert result.transcript == DEFAULT_TRANSCRIPT
    assert result.confidence == DEFAULT_CONFIDENCE
    assert result.speech_rate_wpm == 106
    assert result.pause_count == 2
    assert result.duration_ms == 6200


def test_mock_asr_low_confidence_via_env(monkeypatch):
    monkeypatch.setenv("MOCK_ASR_LOW_CONFIDENCE", "true")
    __import__("src.config", fromlist=["get_settings"]).get_settings.cache_clear()

    client = get_asr_client()
    result = transcribe_with_retry(
        client,
        io.BytesIO(b"fake-audio"),
        "audio/webm",
    )

    assert result.transcript == LOW_CONFIDENCE_TRANSCRIPT
    assert result.confidence == LOW_CONFIDENCE
    assert result.pause_count == 4


def test_mock_asr_low_confidence_via_filename():
    client = get_asr_client()
    result = transcribe_with_retry(
        client,
        io.BytesIO(b"fake-audio"),
        "audio/webm",
        filename="user-low_confidence.webm",
    )

    assert result.transcript == LOW_CONFIDENCE_TRANSCRIPT
    assert result.confidence == LOW_CONFIDENCE


def test_mock_llm_reply_by_scenario_and_turn():
    client = get_llm_client()
    context = LlmReplyContext(
        scenario_slug="interview",
        turn_index=3,
        system_prompt="You are an interviewer.",
        messages=[
            {"speaker": "ai", "text": "Hi, introduce yourself."},
            {"speaker": "user", "text": "My name is Alex."},
        ],
    )

    result = generate_reply_with_retry(client, context)

    assert "role" in result.text.lower()
    assert result.raw_provider_response["provider"] == "mock"


def test_mock_llm_reply_restaurant_scenario():
    client = get_llm_client()
    context = LlmReplyContext(
        scenario_slug="restaurant",
        turn_index=2,
        system_prompt="You are a waiter.",
        messages=[
            {"speaker": "ai", "text": "Welcome."},
            {"speaker": "user", "text": "Table for two."},
        ],
    )

    result = generate_reply_with_retry(client, context)

    assert "special" in result.text.lower()


def test_mock_tts_default_empty_audio():
    client = get_tts_client()
    result = synthesize_with_retry(client, "Thanks for your answer.")

    assert result.mime_type == "audio/mpeg"
    assert result.audio_bytes == b""
    assert result.duration_ms == 0


def test_mock_tts_with_audio_flag(monkeypatch):
    monkeypatch.setenv("MOCK_TTS_HAS_AUDIO", "true")
    __import__("src.config", fromlist=["get_settings"]).get_settings.cache_clear()

    client = get_tts_client()
    result = synthesize_with_retry(client, "Thanks for your answer.")

    assert result.audio_bytes == b"MOCK_AUDIO"
    assert result.duration_ms == 1500


def test_mock_llm_report_structure():
    client = get_llm_client()
    report = generate_report_with_retry(client, "generate report", {"session_id": "s1"})

    assert report["overall_score"] == 76
    assert report["pronunciation_score"] == 78
    assert report["fluency_score"] == 70
    assert report["grammar_score"] == 76
    assert report["expression_score"] == 72
    assert len(report["feedback_items"]) == 2
    assert report["feedback_items"][0]["type"] == "pronunciation"
    assert report["feedback_items"][1]["type"] == "expression"
