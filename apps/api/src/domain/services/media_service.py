from __future__ import annotations

from pathlib import Path

from fastapi import status

from src.config import get_settings
from src.schemas.errors import ApiError

SUPPORTED_AUDIO_MIME_TYPES = frozenset(
    {
        "audio/webm",
        "audio/mp4",
        "audio/mpeg",
        "audio/wav",
        "audio/x-wav",
    }
)

MIME_TO_EXTENSION = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
}


def build_audio_object_key(
    *,
    user_id: str,
    session_id: str,
    turn_id: str,
    speaker: str,
    mime_type: str,
) -> str:
    extension = MIME_TO_EXTENSION.get(mime_type, "bin")
    filename = "user" if speaker == "user" else "ai"
    return (
        f"users/{user_id}/sessions/{session_id}/turns/{turn_id}/"
        f"{filename}.{extension}"
    )


class MediaService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def validate_user_audio(
        self,
        *,
        content: bytes,
        mime_type: str,
        duration_ms: int,
    ) -> None:
        if not content:
            raise ApiError("AUDIO_REQUIRED", "请重新录音。", status.HTTP_422_UNPROCESSABLE_ENTITY)

        max_bytes = self.settings.max_audio_upload_mb * 1024 * 1024
        if len(content) > max_bytes:
            raise ApiError(
                "AUDIO_TOO_LARGE",
                "音频太大，请缩短录音。",
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        if duration_ms > self.settings.max_audio_duration_seconds * 1000:
            raise ApiError(
                "AUDIO_DURATION_EXCEEDED",
                "单次最多录 60 秒。",
                status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if mime_type not in SUPPORTED_AUDIO_MIME_TYPES:
            raise ApiError(
                "UNSUPPORTED_AUDIO_TYPE",
                "当前浏览器录音格式暂不支持。",
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )

    def save_user_audio(
        self,
        *,
        user_id: str,
        session_id: str,
        turn_id: str,
        content: bytes,
        mime_type: str,
    ) -> str:
        object_key = build_audio_object_key(
            user_id=user_id,
            session_id=session_id,
            turn_id=turn_id,
            speaker="user",
            mime_type=mime_type,
        )
        target = Path(self.settings.media_local_root) / object_key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        return object_key

    def save_ai_audio(
        self,
        *,
        user_id: str,
        session_id: str,
        turn_id: str,
        content: bytes,
        mime_type: str,
        duration_ms: int | None = None,
    ) -> str:
        object_key = build_audio_object_key(
            user_id=user_id,
            session_id=session_id,
            turn_id=turn_id,
            speaker="ai",
            mime_type=mime_type,
        )
        target = Path(self.settings.media_local_root) / object_key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        return object_key

    def build_audio_url(self, object_key: str | None) -> str | None:
        if not object_key:
            return None
        return None
