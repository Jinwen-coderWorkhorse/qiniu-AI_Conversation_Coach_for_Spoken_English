from __future__ import annotations

from typing import Protocol

from src.config import get_settings
from src.infrastructure.providers.mock_provider import MockTtsClient
from src.infrastructure.providers.retry import with_retries
from src.infrastructure.providers.types import TtsResult


class TtsClient(Protocol):
    def synthesize(self, text: str, voice: str = "default") -> TtsResult: ...


def _build_tts_client() -> TtsClient:
    settings = get_settings()
    provider = settings.tts_provider or settings.ai_provider
    if provider == "mock":
        return MockTtsClient()
    raise NotImplementedError(f"TTS provider '{provider}' is not implemented.")


def get_tts_client() -> TtsClient:
    return _build_tts_client()


def synthesize_with_retry(
    client: TtsClient,
    text: str,
    *,
    voice: str = "default",
) -> TtsResult:
    settings = get_settings()

    def _call() -> TtsResult:
        return client.synthesize(text, voice=voice)

    return with_retries(
        _call,
        max_retries=settings.provider_max_retries,
        operation_name="TTS",
    )
