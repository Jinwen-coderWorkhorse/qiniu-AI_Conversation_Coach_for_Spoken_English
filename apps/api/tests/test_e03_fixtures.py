from __future__ import annotations

import io

import pytest

from src.infrastructure.providers.mock_provider import (
    DEFAULT_CONFIDENCE,
    DEFAULT_TRANSCRIPT,
    LOW_CONFIDENCE,
    LOW_CONFIDENCE_TRANSCRIPT,
    MOCK_AI_REPLIES,
    MOCK_REPORT,
)
from src.infrastructure.providers.types import LlmReplyContext
from src.schemas.report_schema import ReportSchema
from tests.fixtures.loader import (
    SCENARIO_SLUGS,
    load_ai_replies,
    load_audio_bytes,
    load_low_confidence_transcript,
    load_report,
    load_transcript,
    list_audio_fixtures,
)


@pytest.mark.parametrize("scenario_slug", SCENARIO_SLUGS)
def test_transcript_fixtures_are_readable(scenario_slug: str):
    fixture = load_transcript(scenario_slug)

    assert fixture["scenario_slug"] == scenario_slug
    assert fixture["transcript"]
    assert 0 < fixture["confidence"] <= 1
    assert fixture["needs_retry"] is False
    assert fixture["audio_fixture"]
    assert load_audio_bytes(fixture["audio_fixture"])


def test_interview_transcript_matches_mock_provider_default():
    fixture = load_transcript("interview")

    assert fixture["transcript"] == DEFAULT_TRANSCRIPT
    assert fixture["confidence"] == DEFAULT_CONFIDENCE


def test_low_confidence_transcript_matches_mock_provider():
    fixture = load_low_confidence_transcript()

    assert fixture["transcript"] == LOW_CONFIDENCE_TRANSCRIPT
    assert fixture["confidence"] == LOW_CONFIDENCE
    assert fixture["needs_retry"] is True
    assert "low_confidence" in fixture["audio_fixture"]


@pytest.mark.parametrize("scenario_slug", SCENARIO_SLUGS)
def test_ai_reply_fixtures_match_mock_provider(scenario_slug: str):
    fixture = load_ai_replies(scenario_slug)

    assert fixture["scenario_slug"] == scenario_slug
    assert fixture["replies"] == MOCK_AI_REPLIES[scenario_slug]


@pytest.mark.parametrize("scenario_slug", SCENARIO_SLUGS)
def test_ai_reply_sequence_can_drive_mock_llm(scenario_slug: str, monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "mock")
    __import__("src.config", fromlist=["get_settings"]).get_settings.cache_clear()

    from src.infrastructure.providers.llm_client import generate_reply_with_retry, get_llm_client

    fixture = load_ai_replies(scenario_slug)
    client = get_llm_client()

    for turn_no, expected_text in enumerate(fixture["replies"], start=1):
        context = LlmReplyContext(
            scenario_slug=scenario_slug,
            turn_index=turn_no + 1,
            system_prompt="fixture test",
            messages=[{"speaker": "user", "text": f"user turn {turn_no}"}] * turn_no,
        )
        result = generate_reply_with_retry(client, context)
        assert result.text == expected_text


def test_report_fixture_matches_mock_provider_and_schema():
    fixture = load_report("default")

    assert fixture["overall_score"] == MOCK_REPORT["overall_score"]
    assert fixture["pronunciation_score"] == MOCK_REPORT["pronunciation_score"]
    assert fixture["fluency_score"] == MOCK_REPORT["fluency_score"]
    assert fixture["grammar_score"] == MOCK_REPORT["grammar_score"]
    assert fixture["expression_score"] == MOCK_REPORT["expression_score"]
    assert fixture["feedback_items"] == MOCK_REPORT["feedback_items"]

    validated = ReportSchema.model_validate(fixture)
    assert validated.overall_score == 76
    assert len(validated.feedback_items) == 2
    assert validated.feedback_items[0].type == "pronunciation"
    assert validated.feedback_items[1].type == "expression"


def test_audio_fixtures_are_small_placeholders():
    audio_names = list_audio_fixtures()

    assert len(audio_names) == 4
    for name in audio_names:
        payload = load_audio_bytes(name)
        assert len(payload) < 64
        assert payload.startswith(b"MOCK_FIXTURE_AUDIO:")


def test_low_confidence_audio_triggers_mock_asr_path(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "mock")
    monkeypatch.delenv("MOCK_ASR_LOW_CONFIDENCE", raising=False)
    __import__("src.config", fromlist=["get_settings"]).get_settings.cache_clear()

    from src.infrastructure.providers.asr_client import get_asr_client, transcribe_with_retry

    audio = load_audio_bytes("low_confidence_user.webm")
    result = transcribe_with_retry(
        get_asr_client(),
        io.BytesIO(audio),
        "audio/webm",
        filename="low_confidence_user.webm",
    )

    assert result.transcript == LOW_CONFIDENCE_TRANSCRIPT
    assert result.confidence == LOW_CONFIDENCE
