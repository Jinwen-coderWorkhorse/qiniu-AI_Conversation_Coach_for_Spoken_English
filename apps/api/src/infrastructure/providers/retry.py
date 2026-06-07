from __future__ import annotations

import time
from collections.abc import Callable
from typing import TypeVar

from src.infrastructure.providers.errors import ProviderError

T = TypeVar("T")


def with_retries(
    operation: Callable[[], T],
    *,
    max_retries: int,
    operation_name: str,
) -> T:
    attempts = 0
    last_error: ProviderError | None = None

    while attempts <= max_retries:
        try:
            return operation()
        except ProviderError as exc:
            last_error = exc
            if not exc.retryable or attempts >= max_retries:
                raise
            attempts += 1
            time.sleep(0.05 * attempts)

    if last_error is not None:
        raise last_error
    raise ProviderError(
        f"{operation_name}_FAILED",
        f"{operation_name} failed after retries.",
        retryable=False,
    )
