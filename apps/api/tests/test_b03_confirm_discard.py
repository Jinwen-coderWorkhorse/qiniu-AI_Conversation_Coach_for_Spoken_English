from __future__ import annotations

import io

from fastapi.testclient import TestClient


def _reset_db_caches() -> None:
    from src.config import get_settings
    from src.infrastructure.db import get_engine, get_sessionmaker

    get_settings.cache_clear()
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()


def _setup_client(monkeypatch, tmp_path, anonymous_id: str) -> tuple[TestClient, dict[str, str], str]:
    db_path = tmp_path / f"{anonymous_id}.db"
    media_root = tmp_path / "media"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path.as_posix()}")
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    monkeypatch.setenv("MEDIA_LOCAL_ROOT", str(media_root))
    monkeypatch.setenv("AI_PROVIDER", "mock")
    _reset_db_caches()

    from src.scripts.seed_scenarios import seed_scenarios
    from src.main import app

    seed_scenarios()
    client = TestClient(app)
    auth = client.post(
        "/api/v1/auth/anonymous",
        json={"anonymous_id": anonymous_id, "anonymous_secret": "secret-b03"},
    )
    headers = {"Authorization": f"Bearer {auth.json()['access_token']}"}
    session = client.post(
        "/api/v1/practice-sessions",
        headers=headers,
        json={"scenario_slug": "interview"},
    )
    return client, headers, session.json()["id"]


def _upload_and_get_turn_id(client, headers, session_id, client_turn_id: str) -> str:
    response = client.post(
        f"/api/v1/practice-sessions/{session_id}/user-turns",
        headers=headers,
        data={
            "client_turn_id": client_turn_id,
            "duration_ms": "6200",
            "mime_type": "audio/webm",
        },
        files={"audio": ("recording.webm", io.BytesIO(b"fake-audio"), "audio/webm")},
    )
    assert response.status_code == 200
    return response.json()["turn"]["id"]


def test_b03_confirm_returns_ai_turn(monkeypatch, tmp_path):
    client, headers, session_id = _setup_client(monkeypatch, tmp_path, "device-b03-confirm")
    user_turn_id = _upload_and_get_turn_id(client, headers, session_id, "turn-confirm-1")

    confirm = client.post(
        f"/api/v1/practice-sessions/{session_id}/turns/{user_turn_id}/confirm",
        headers=headers,
        json={"accepted": True},
    )
    assert confirm.status_code == 200
    body = confirm.json()
    assert body["status"] == "ai_reply_ready"
    assert body["user_turn_id"] == user_turn_id
    assert body["ai_turn"]["speaker"] == "ai"
    assert body["ai_turn"]["turn_index"] == 3
    assert body["ai_turn"]["text"]
    assert body["current_step_no"] == 2


def test_b03_confirm_is_idempotent(monkeypatch, tmp_path):
    client, headers, session_id = _setup_client(monkeypatch, tmp_path, "device-b03-idempotent")
    user_turn_id = _upload_and_get_turn_id(client, headers, session_id, "turn-idem-1")

    first = client.post(
        f"/api/v1/practice-sessions/{session_id}/turns/{user_turn_id}/confirm",
        headers=headers,
        json={"accepted": True},
    )
    second = client.post(
        f"/api/v1/practice-sessions/{session_id}/turns/{user_turn_id}/confirm",
        headers=headers,
        json={"accepted": True},
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["ai_turn"]["id"] == second.json()["ai_turn"]["id"]

    detail = client.get(f"/api/v1/practice-sessions/{session_id}", headers=headers)
    ai_turns = [t for t in detail.json()["turns"] if t["speaker"] == "ai"]
    assert len(ai_turns) == 2


def test_b03_discard_marks_turn_discarded(monkeypatch, tmp_path):
    client, headers, session_id = _setup_client(monkeypatch, tmp_path, "device-b03-discard")
    user_turn_id = _upload_and_get_turn_id(client, headers, session_id, "turn-discard-1")

    discard = client.post(
        f"/api/v1/practice-sessions/{session_id}/turns/{user_turn_id}/discard",
        headers=headers,
    )
    assert discard.status_code == 200
    assert discard.json()["status"] == "discarded"

    confirm = client.post(
        f"/api/v1/practice-sessions/{session_id}/turns/{user_turn_id}/confirm",
        headers=headers,
        json={"accepted": True},
    )
    assert confirm.status_code == 409
    assert confirm.json()["error"]["code"] == "TURN_NOT_PENDING"


def test_b03_confirm_after_discard_allows_new_upload(monkeypatch, tmp_path):
    client, headers, session_id = _setup_client(monkeypatch, tmp_path, "device-b03-redo")
    first_turn_id = _upload_and_get_turn_id(client, headers, session_id, "turn-redo-1")

    discard = client.post(
        f"/api/v1/practice-sessions/{session_id}/turns/{first_turn_id}/discard",
        headers=headers,
    )
    assert discard.status_code == 200

    second_turn_id = _upload_and_get_turn_id(client, headers, session_id, "turn-redo-2")
    assert second_turn_id != first_turn_id

    confirm = client.post(
        f"/api/v1/practice-sessions/{session_id}/turns/{second_turn_id}/confirm",
        headers=headers,
        json={"accepted": True},
    )
    assert confirm.status_code == 200
    assert confirm.json()["ai_turn"]["text"]


def test_b03_confirm_with_tts_audio_flag(monkeypatch, tmp_path):
    monkeypatch.setenv("MOCK_TTS_HAS_AUDIO", "true")
    client, headers, session_id = _setup_client(monkeypatch, tmp_path, "device-b03-tts")
    user_turn_id = _upload_and_get_turn_id(client, headers, session_id, "turn-tts-1")

    confirm = client.post(
        f"/api/v1/practice-sessions/{session_id}/turns/{user_turn_id}/confirm",
        headers=headers,
        json={"accepted": True},
    )
    assert confirm.status_code == 200
    assert confirm.json()["ai_turn"]["audio_mime_type"] == "audio/mpeg"
    assert confirm.json()["ai_turn"]["audio_url"] is None
