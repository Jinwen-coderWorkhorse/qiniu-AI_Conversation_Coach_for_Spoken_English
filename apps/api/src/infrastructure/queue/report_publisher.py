from __future__ import annotations

from src.config import get_settings


def publish_report_job(*, session_id: str, report_id: str) -> None:
    settings = get_settings()
    if settings.report_worker_mode == "sync":
        from src.workers.report_worker import process_report_job

        process_report_job(session_id=session_id, report_id=report_id)
        return

    raise NotImplementedError("Async report queue is not configured for MVP mock mode.")
