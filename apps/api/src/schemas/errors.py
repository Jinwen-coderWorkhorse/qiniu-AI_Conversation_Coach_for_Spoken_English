from __future__ import annotations

from dataclasses import dataclass

from fastapi import status


@dataclass
class ApiError(Exception):
    code: str
    message: str
    http_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR


def error_payload(code: str, message: str, request_id: str) -> dict[str, dict[str, str]]:
    return {
        "error": {
            "code": code,
            "message": message,
            "request_id": request_id,
        }
    }
