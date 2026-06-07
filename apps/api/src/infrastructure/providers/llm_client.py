from __future__ import annotations

from typing import Protocol

from src.config import get_settings
from src.infrastructure.providers.mock_provider import MockLlmClient
from src.infrastructure.providers.retry import with_retries
from src.infrastructure.providers.types import LlmReplyContext, LlmReplyResult


class LlmClient(Protocol):
    def generate_reply(self, context: LlmReplyContext) -> LlmReplyResult: ...

    def generate_report(self, prompt: str, context: dict) -> dict: ...


def _build_llm_client() -> LlmClient:
    settings = get_settings()
    provider = settings.ai_provider
    if provider == "mock":
        return MockLlmClient()
    raise NotImplementedError(f"LLM provider '{provider}' is not implemented.")


def get_llm_client() -> LlmClient:
    return _build_llm_client()


def generate_reply_with_retry(client: LlmClient, context: LlmReplyContext) -> LlmReplyResult:
    settings = get_settings()

    def _call() -> LlmReplyResult:
        return client.generate_reply(context)

    return with_retries(
        _call,
        max_retries=settings.provider_max_retries,
        operation_name="LLM",
    )


def generate_report_with_retry(
    client: LlmClient,
    prompt: str,
    context: dict,
) -> dict:
    settings = get_settings()

    def _call() -> dict:
        return client.generate_report(prompt, context)

    return with_retries(
        _call,
        max_retries=settings.provider_max_retries,
        operation_name="LLM_REPORT",
    )
