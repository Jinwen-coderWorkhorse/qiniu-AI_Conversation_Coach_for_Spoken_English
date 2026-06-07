from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, status
from sqlalchemy.orm import Session

from src.domain.models.practice_session import PracticeSession
from src.domain.models.user import User
from src.infrastructure.db import get_db_session
from src.infrastructure.repositories.practice_session_repository import (
    PracticeSessionRepository,
)
from src.infrastructure.repositories.user_repository import UserRepository
from src.schemas.errors import ApiError
from src.utils.security import decode_access_token


DbSession = Annotated[Session, Depends(get_db_session)]


def get_current_user(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise ApiError("UNAUTHORIZED", "请重新进入应用。", status.HTTP_401_UNAUTHORIZED)

    token = authorization.removeprefix("Bearer ").strip()
    user_id = decode_access_token(token)
    user = UserRepository(db).get_by_id(user_id)
    if user is None:
        raise ApiError("UNAUTHORIZED", "请重新进入应用。", status.HTTP_401_UNAUTHORIZED)
    return user


def require_session_owner(
    id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> PracticeSession:
    session = PracticeSessionRepository(db).get_by_id(id)
    if session is None:
        raise ApiError("NOT_FOUND", "练习不存在。", status.HTTP_404_NOT_FOUND)
    if session.user_id != current_user.id:
        raise ApiError("FORBIDDEN", "无权访问该练习。", status.HTTP_403_FORBIDDEN)
    return session
