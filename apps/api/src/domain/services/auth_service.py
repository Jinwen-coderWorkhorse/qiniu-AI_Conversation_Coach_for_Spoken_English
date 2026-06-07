from __future__ import annotations

from fastapi import status
from sqlalchemy.orm import Session

from src.infrastructure.repositories.user_repository import UserRepository
from src.schemas.auth import AnonymousAuthResponse, UserIdentity
from src.schemas.errors import ApiError
from src.utils.security import create_access_token, hash_secret, verify_secret


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)

    def create_or_restore(
        self,
        *,
        anonymous_id: str,
        anonymous_secret: str,
    ) -> AnonymousAuthResponse:
        user = self.users.get_by_anonymous_id(anonymous_id)
        if user is None:
            user = self.users.create(
                anonymous_id=anonymous_id,
                anonymous_secret_hash=hash_secret(anonymous_secret),
            )
            self.db.commit()
            self.db.refresh(user)
        elif not verify_secret(anonymous_secret, user.anonymous_secret_hash):
            raise ApiError(
                "UNAUTHORIZED",
                "匿名身份校验失败。",
                status.HTTP_401_UNAUTHORIZED,
            )

        token, expires_in = create_access_token(user.id)
        return AnonymousAuthResponse(
            user=UserIdentity(id=user.id, anonymous_id=user.anonymous_id),
            access_token=token,
            expires_in=expires_in,
        )
