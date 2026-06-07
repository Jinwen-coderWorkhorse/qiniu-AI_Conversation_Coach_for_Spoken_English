from __future__ import annotations

from fastapi.testclient import TestClient


def test_a_backend_foundation_flow(monkeypatch, tmp_path):
    db_path = tmp_path / "a_foundation.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path.as_posix()}")
    monkeypatch.setenv("JWT_SECRET", "test-secret")

    from src.config import get_settings
    from src.infrastructure.db import get_engine, get_sessionmaker

    get_settings.cache_clear()
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()

    from src.scripts.seed_scenarios import seed_scenarios
    from src.main import app

    seed_scenarios()
    client = TestClient(app)

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
    assert health.headers["X-Request-Id"]

    auth_payload = {
        "anonymous_id": "device-test-1",
        "anonymous_secret": "secret-test-1",
    }
    created_user = client.post("/api/v1/auth/anonymous", json=auth_payload)
    assert created_user.status_code == 200
    token = created_user.json()["access_token"]

    restored_user = client.post("/api/v1/auth/anonymous", json=auth_payload)
    assert restored_user.status_code == 200
    assert restored_user.json()["user"]["anonymous_id"] == "device-test-1"

    wrong_secret = client.post(
        "/api/v1/auth/anonymous",
        json={"anonymous_id": "device-test-1", "anonymous_secret": "wrong"},
    )
    assert wrong_secret.status_code == 401
    assert wrong_secret.json()["error"]["code"] == "UNAUTHORIZED"

    headers = {"Authorization": f"Bearer {token}"}
    scenarios = client.get("/api/v1/scenarios", headers=headers)
    assert scenarios.status_code == 200
    assert [item["slug"] for item in scenarios.json()["items"]] == [
        "interview",
        "restaurant",
        "meeting",
    ]

    scenario_detail = client.get("/api/v1/scenarios/interview", headers=headers)
    assert scenario_detail.status_code == 200
    assert scenario_detail.json()["steps"][0]["step_no"] == 1

    created_session = client.post(
        "/api/v1/practice-sessions",
        headers=headers,
        json={"scenario_slug": "interview"},
    )
    assert created_session.status_code == 200
    session_body = created_session.json()
    assert session_body["status"] == "in_progress"
    assert session_body["opening_message"]["text"]
    assert session_body["opening_message"]["audio_url"] is None

    session_id = session_body["id"]
    session_detail = client.get(f"/api/v1/practice-sessions/{session_id}", headers=headers)
    assert session_detail.status_code == 200
    assert session_detail.json()["turns"][0]["speaker"] == "ai"
    assert session_detail.json()["turns"][0]["turn_index"] == 1

    conflict = client.post(
        "/api/v1/practice-sessions",
        headers=headers,
        json={"scenario_slug": "meeting"},
    )
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "SESSION_ALREADY_IN_PROGRESS"

    second_user = client.post(
        "/api/v1/auth/anonymous",
        json={"anonymous_id": "device-test-2", "anonymous_secret": "secret-test-2"},
    )
    second_headers = {"Authorization": f"Bearer {second_user.json()['access_token']}"}
    forbidden = client.get(
        f"/api/v1/practice-sessions/{session_id}",
        headers=second_headers,
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "FORBIDDEN"
