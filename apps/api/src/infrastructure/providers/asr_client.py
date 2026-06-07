from __future__ import annotations

from typing import BinaryIO, Protocol

from src.config import get_settings
from src.infrastructure.providers.mock_provider import MockAsrClient
from src.infrastructure.providers.retry import with_retries
from src.infrastructure.providers.types import AsrResult


class AsrClient(Protocol):
    def transcribe(
        self,
        audio_file: BinaryIO,
        mime_type: str,
        *,
        filename: str | None = None,
        duration_ms: int | None = None,
    ) -> AsrResult: ...


def _build_asr_client() -> AsrClient:
    settings = get_settings()
    provider = settings.asr_provider or settings.ai_provider
    if provider == "mock":
        return MockAsrClient()
    raise NotImplementedError(f"ASR provider '{provider}' is not implemented.")


def get_asr_client() -> AsrClient:
    return _build_asr_client()


def transcribe_with_retry(
    client: AsrClient,
    audio_file: BinaryIO,
    mime_type: str,
    *,
    filename: str | None = None,
    duration_ms: int | None = None,
) -> AsrResult:
    settings = get_settings()

    def _call() -> AsrResult:
        return client.transcribe(
            audio_file,
            mime_type,
            filename=filename,
            duration_ms=duration_ms,
        )

    return with_retries(
        _call,
        max_retries=settings.provider_max_retries,
        operation_name="ASR",
    )
