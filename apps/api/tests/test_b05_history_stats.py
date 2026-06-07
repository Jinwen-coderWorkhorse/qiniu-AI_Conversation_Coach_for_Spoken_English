from __future__ import annotations

import io

from fastapi.testclient import TestClient


def _reset_db_caches() -> None:
    from src.config import get_settings
    from src.infrastructure.db import get_engine, get_sessionmaker

    get_settings.cache_clear()
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()


def _setup_client(monkeypatch, tmp_path, anonymous_id: str) -> tuple[TestClient, dict[str, str]]:
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
        json={"anonymous_id": anonymous_id, "anonymous_secret": "secret-b05"},
    )
    headers = {"Authorization": f"Bearer {auth.json()['access_token']}"}
    return client, headers


def _complete_session(
    client: TestClient,
    headers: dict[str, str],
    *,
    scenario_slug: str,
    client_turn_id: str,
) -> str:
    created = client.post(
        "/api/v1/practice-sessions",
        headers=headers,
        json={"scenario_slug": scenario_slug},
    )
    assert created.status_code == 200
    session_id = created.json()["id"]

    upload = client.post(
        f"/api/v1/practice-sessions/{session_id}/user-turns",
        headers=headers,
        data={
            "client_turn_id": client_turn_id,
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

    end = client.post(
        f"/api/v1/practice-sessions/{session_id}/end",
        headers=headers,
        json={"reason": "user_finished"},
    )
    assert end.status_code == 200
    return session_id


def test_b05_history_lists_completed_session(monkeypatch, tmp_path):
    client, headers = _setup_client(monkeypatch, tmp_path, "device-b05-history")
    session_id = _complete_session(
        client,
        headers,
        scenario_slug="interview",
        client_turn_id="turn-b05-1",
    )

    history = client.get("/api/v1/practice-sessions", headers=headers)
    assert history.status_code == 200
    body = history.json()
    assert body["pagination"]["total"] == 1
    assert body["items"][0]["id"] == session_id
    assert body["items"][0]["scenario_name"] == "英文面试"
    assert body["items"][0]["overall_score"] == 76
    assert body["items"][0]["level_description"] == "可以完成基本沟通"


def test_b05_stats_after_completed_session(monkeypatch, tmp_path):
    client, headers = _setup_client(monkeypatch, tmp_path, "device-b05-stats")
    _complete_session(
        client,
        headers,
        scenario_slug="restaurant",
        client_turn_id="turn-b05-stats",
    )

    stats = client.get("/api/v1/me/stats", headers=headers)
    assert stats.status_code == 200
    body = stats.json()
    assert body["practice_count"] == 1
    assert body["spoken_minutes"] >= 0
    assert body["user_word_count"] >= 10
    assert body["average_score"] == 76
    assert len(body["score_trend"]) == 1
    assert body["score_trend"][0]["score"] == 76


def test_b05_history_filters_by_scenario_slug(monkeypatch, tmp_path):
    client, headers = _setup_client(monkeypatch, tmp_path, "device-b05-filter")
    _complete_session(
        client,
        headers,
        scenario_slug="interview",
        client_turn_id="turn-b05-filter-1",
    )

    filtered = client.get(
        "/api/v1/practice-sessions",
        headers=headers,
        params={"scenario_slug": "meeting"},
    )
    assert filtered.status_code == 200
    assert filtered.json()["pagination"]["total"] == 0

    interview_only = client.get(
        "/api/v1/practice-sessions",
        headers=headers,
        params={"scenario_slug": "interview"},
    )
    assert interview_only.status_code == 200
    assert interview_only.json()["pagination"]["total"] == 1


def test_b05_history_empty_for_new_user(monkeypatch, tmp_path):
    client, headers = _setup_client(monkeypatch, tmp_path, "device-b05-empty")

    history = client.get("/api/v1/practice-sessions", headers=headers)
    assert history.status_code == 200
    assert history.json()["items"] == []
    assert history.json()["pagination"]["total"] == 0

    stats = client.get("/api/v1/me/stats", headers=headers)
    assert stats.status_code == 200
    assert stats.json()["practice_count"] == 0
    assert stats.json()["average_score"] is None
    assert stats.json()["score_trend"] == []
