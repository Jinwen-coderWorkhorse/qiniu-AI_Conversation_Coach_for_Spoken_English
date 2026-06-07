from __future__ import annotations

import io

from fastapi.testclient import TestClient


def _reset_db_caches() -> None:
    from src.config import get_settings
    from src.infrastructure.db import get_engine, get_sessionmaker

    get_settings.cache_clear()
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()


def _auth_and_session(
    client: TestClient,
    *,
    anonymous_id: str,
) -> tuple[dict[str, str], str]:
    auth = client.post(
        "/api/v1/auth/anonymous",
        json={"anonymous_id": anonymous_id, "anonymous_secret": "secret-b02"},
    )
    token = auth.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    session = client.post(
        "/api/v1/practice-sessions",
        headers=headers,
        json={"scenario_slug": "interview"},
    )
    return headers, session.json()["id"]


def _upload_turn(
    client: TestClient,
    *,
    headers: dict[str, str],
    session_id: str,
    client_turn_id: str,
    audio: bytes = b"fake-audio-bytes",
    filename: str = "recording.webm",
    duration_ms: int = 6200,
    mime_type: str = "audio/webm",
):
    return client.post(
        f"/api/v1/practice-sessions/{session_id}/user-turns",
        headers=headers,
        data={
            "client_turn_id": client_turn_id,
            "duration_ms": str(duration_ms),
            "mime_type": mime_type,
        },
        files={"audio": (filename, io.BytesIO(audio), mime_type)},
    )


def test_b02_upload_user_turn_returns_transcript(monkeypatch, tmp_path):
    db_path = tmp_path / "b02.db"
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
    headers, session_id = _auth_and_session(client, anonymous_id="device-b02-upload")

    response = _upload_turn(
        client,
        headers=headers,
        session_id=session_id,
        client_turn_id="turn-client-1",
    )
    assert response.status_code == 200
    body = response.json()
    assert body["turn"]["speaker"] == "user"
    assert body["turn"]["turn_index"] == 2
    assert body["turn"]["transcript"]
    assert body["turn"]["asr_confidence"] == 0.91
    assert body["turn"]["needs_retry"] is False
    assert body["turn"]["metrics"]["duration_ms"] == 6200
    assert body["hint"] is None


def test_b02_client_turn_id_is_idempotent(monkeypatch, tmp_path):
    db_path = tmp_path / "b02_idempotent.db"
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
    headers, session_id = _auth_and_session(client, anonymous_id="device-b02-idempotent")

    first = _upload_turn(
        client,
        headers=headers,
        session_id=session_id,
        client_turn_id="turn-client-dup",
    )
    second = _upload_turn(
        client,
        headers=headers,
        session_id=session_id,
        client_turn_id="turn-client-dup",
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["turn"]["id"] == second.json()["turn"]["id"]

    detail = client.get(f"/api/v1/practice-sessions/{session_id}", headers=headers)
    user_turns = [t for t in detail.json()["turns"] if t["speaker"] == "user"]
    assert len(user_turns) == 1


def test_b02_low_confidence_returns_needs_retry(monkeypatch, tmp_path):
    db_path = tmp_path / "b02_low.db"
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
    headers, session_id = _auth_and_session(client, anonymous_id="device-b02-low")

    response = _upload_turn(
        client,
        headers=headers,
        session_id=session_id,
        client_turn_id="turn-client-low",
        filename="user-low_confidence.webm",
    )
    assert response.status_code == 200
    body = response.json()
    assert body["turn"]["needs_retry"] is True
    assert body["turn"]["asr_confidence"] == 0.52
    assert body["hint"] == "识别不太确定，建议重说一次。"


def test_b02_session_not_in_progress(monkeypatch, tmp_path):
    db_path = tmp_path / "b02_closed.db"
    media_root = tmp_path / "media"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path.as_posix()}")
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    monkeypatch.setenv("MEDIA_LOCAL_ROOT", str(media_root))
    monkeypatch.setenv("AI_PROVIDER", "mock")
    _reset_db_caches()

    from src.infrastructure.db import get_sessionmaker
    from src.scripts.seed_scenarios import seed_scenarios
    from src.main import app

    seed_scenarios()
    client = TestClient(app)
    headers, session_id = _auth_and_session(client, anonymous_id="device-b02-closed")

    session_factory = get_sessionmaker()
    with session_factory() as db:
        from src.infrastructure.repositories.practice_session_repository import (
            PracticeSessionRepository,
        )

        session = PracticeSessionRepository(db).get_by_id(session_id)
        session.status = "reporting"
        db.commit()

    response = _upload_turn(
        client,
        headers=headers,
        session_id=session_id,
        client_turn_id="turn-after-end",
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SESSION_NOT_IN_PROGRESS"


def test_b02_audio_required(monkeypatch, tmp_path):
    db_path = tmp_path / "b02_empty.db"
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
    headers, session_id = _auth_and_session(client, anonymous_id="device-b02-empty")

    response = _upload_turn(
        client,
        headers=headers,
        session_id=session_id,
        client_turn_id="turn-empty",
        audio=b"",
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "AUDIO_REQUIRED"
