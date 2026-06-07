from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: str) -> User | None:
        stmt = select(User).where(User.id == user_id, User.deleted_at.is_(None))
        return self.db.scalar(stmt)

    def get_by_anonymous_id(self, anonymous_id: str) -> User | None:
        stmt = select(User).where(
            User.anonymous_id == anonymous_id,
            User.deleted_at.is_(None),
        )
        return self.db.scalar(stmt)

    def create(self, anonymous_id: str, anonymous_secret_hash: str) -> User:
        user = User(
            anonymous_id=anonymous_id,
            anonymous_secret_hash=anonymous_secret_hash,
        )
        self.db.add(user)
        return user
