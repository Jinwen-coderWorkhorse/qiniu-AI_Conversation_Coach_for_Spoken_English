from __future__ import annotations

from src.application.use_cases.generate_report import generate_report


def process_report_job(*, session_id: str, report_id: str) -> None:
    generate_report(session_id=session_id, report_id=report_id)
