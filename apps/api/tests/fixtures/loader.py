from __future__ import annotations

import json
from pathlib import Path
from typing import Any

FIXTURES_DIR = Path(__file__).resolve().parent

SCENARIO_SLUGS = ("interview", "restaurant", "meeting")


def fixtures_dir() -> Path:
    return FIXTURES_DIR


def load_json(*parts: str) -> dict[str, Any]:
    path = FIXTURES_DIR.joinpath(*parts)
    if not path.is_file():
        raise FileNotFoundError(f"Fixture not found: {path}")
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_transcript(scenario_slug: str) -> dict[str, Any]:
    if scenario_slug not in SCENARIO_SLUGS:
        raise ValueError(f"Unsupported scenario slug: {scenario_slug}")
    return load_json("transcripts", f"{scenario_slug}.json")


def load_low_confidence_transcript() -> dict[str, Any]:
    return load_json("transcripts", "low_confidence.json")


def load_ai_replies(scenario_slug: str) -> dict[str, Any]:
    if scenario_slug not in SCENARIO_SLUGS:
        raise ValueError(f"Unsupported scenario slug: {scenario_slug}")
    return load_json("ai_replies", f"{scenario_slug}.json")


def load_report(name: str = "default") -> dict[str, Any]:
    return load_json("reports", f"{name}.json")


def load_audio_bytes(filename: str) -> bytes:
    path = FIXTURES_DIR / "audio" / filename
    if not path.is_file():
        raise FileNotFoundError(f"Audio fixture not found: {path}")
    return path.read_bytes()


def list_audio_fixtures() -> list[str]:
    audio_dir = FIXTURES_DIR / "audio"
    return sorted(path.name for path in audio_dir.glob("*.webm"))
