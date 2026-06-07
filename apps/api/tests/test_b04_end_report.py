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
    monkeypatch.setenv("REPORT_WORKER_MODE", "sync")
    _reset_db_caches()

    from src.scripts.seed_scenarios import seed_scenarios
    from src.main import app

    seed_scenarios()
    client = TestClient(app)
    auth = client.post(
        "/api/v1/auth/anonymous",
        json={"anonymous_id": anonymous_id, "anonymous_secret": "secret-b04"},
    )
    headers = {"Authorization": f"Bearer {auth.json()['access_token']}"}
    session = client.post(
        "/api/v1/practice-sessions",
        headers=headers,
        json={"scenario_slug": "interview"},
    )
    return client, headers, session.json()["id"]


def _confirm_one_turn(client, headers, session_id) -> None:
    upload = client.post(
        f"/api/v1/practice-sessions/{session_id}/user-turns",
        headers=headers,
        data={
            "client_turn_id": "turn-b04-1",
            "duration_ms": "6200",
            "mime_type": "audio/webm",
        },
        files={"audio": ("recording.webm", io.BytesIO(b"fake-audio"), "audio/webm")},
    )
    assert upload.status_code == 200
    turn_id = upload.json()["turn"]["id"]
    confirm = client.post(
        f"/api/v1/practice-sessions/{session_id}/turns/{turn_id}/confirm",
        headers=headers,
        json={"accepted": True},
    )
    assert confirm.status_code == 200


def test_b04_end_without_confirmed_turn_conflicts(monkeypatch, tmp_path):
    client, headers, session_id = _setup_client(monkeypatch, tmp_path, "device-b04-empty")

    end = client.post(
        f"/api/v1/practice-sessions/{session_id}/end",
        headers=headers,
        json={"reason": "user_finished"},
    )
    assert end.status_code == 409
    assert end.json()["error"]["code"] == "CONFLICT"


def test_b04_end_and_get_completed_report(monkeypatch, tmp_path):
    client, headers, session_id = _setup_client(monkeypatch, tmp_path, "device-b04-report")
    _confirm_one_turn(client, headers, session_id)

    end = client.post(
        f"/api/v1/practice-sessions/{session_id}/end",
        headers=headers,
        json={"reason": "user_finished"},
    )
    assert end.status_code == 200
    end_body = end.json()
    assert end_body["status"] == "reporting"
    report_id = end_body["report_id"]

    report = client.get(f"/api/v1/practice-sessions/{session_id}/report", headers=headers)
    assert report.status_code == 200
    report_body = report.json()
    assert report_body["id"] == report_id
    assert report_body["status"] == "completed"
    assert report_body["overview"]["overall_score"] == 76
    assert report_body["overview"]["scores"]["pronunciation"] == 78
    assert len(report_body["items"]) == 2
    assert report_body["items"][0]["type"] == "pronunciation"
    assert report_body["items"][1]["type"] == "expression"

    session_detail = client.get(f"/api/v1/practice-sessions/{session_id}", headers=headers)
    assert session_detail.status_code == 200
    assert session_detail.json()["status"] == "completed"


def test_b04_end_is_idempotent(monkeypatch, tmp_path):
    client, headers, session_id = _setup_client(monkeypatch, tmp_path, "device-b04-idempotent")
    _confirm_one_turn(client, headers, session_id)

    first = client.post(
        f"/api/v1/practice-sessions/{session_id}/end",
        headers=headers,
        json={"reason": "user_finished"},
    )
    second = client.post(
        f"/api/v1/practice-sessions/{session_id}/end",
        headers=headers,
        json={"reason": "user_finished"},
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["report_id"] == second.json()["report_id"]


def test_b04_report_not_found_before_end(monkeypatch, tmp_path):
    client, headers, session_id = _setup_client(monkeypatch, tmp_path, "device-b04-no-report")

    report = client.get(f"/api/v1/practice-sessions/{session_id}/report", headers=headers)
    assert report.status_code == 404
    assert report.json()["error"]["code"] == "NOT_FOUND"
