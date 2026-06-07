from __future__ import annotations

from pathlib import Path

AUDIO_DIR = Path(__file__).resolve().parent / "audio"

PLACEHOLDER_AUDIO: dict[str, bytes] = {
    "interview_user.webm": b"MOCK_FIXTURE_AUDIO:interview",
    "restaurant_user.webm": b"MOCK_FIXTURE_AUDIO:restaurant",
    "meeting_user.webm": b"MOCK_FIXTURE_AUDIO:meeting",
    "low_confidence_user.webm": b"MOCK_FIXTURE_AUDIO:low_confidence",
}


def generate() -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    for filename, payload in PLACEHOLDER_AUDIO.items():
        path = AUDIO_DIR / filename
        path.write_bytes(payload)
        print(f"Wrote {path} ({len(payload)} bytes)")


if __name__ == "__main__":
    generate()
