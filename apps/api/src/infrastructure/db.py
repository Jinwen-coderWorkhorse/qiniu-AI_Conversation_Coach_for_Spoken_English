from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from src.config import get_settings
from src.domain.models import AssessmentReport, ConversationTurn, PracticeSession, Scenario, User
from src.domain.models.base import Base


@lru_cache
def get_engine():
    settings = get_settings()
    connect_args = (
        {"check_same_thread": False}
        if settings.database_url.startswith("sqlite")
        else {}
    )
    return create_engine(settings.database_url, connect_args=connect_args, future=True)


@lru_cache
def get_sessionmaker():
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, future=True)


def create_db_and_tables() -> None:
    Base.metadata.create_all(bind=get_engine())


def get_db_session() -> Session:
    session_factory = get_sessionmaker()
    with session_factory() as session:
        yield session
