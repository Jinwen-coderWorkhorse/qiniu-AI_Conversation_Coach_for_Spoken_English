from __future__ import annotations

from datetime import timedelta
import base64
import hashlib
import hmac
import os

import jwt
from fastapi import status

from src.config import get_settings
from src.schemas.errors import ApiError
from src.utils.time import utc_now

_HASH_ALGORITHM = "pbkdf2_sha256"
_ITERATIONS = 260_000


def hash_secret(secret: str) -> str:
    salt = base64.urlsafe_b64encode(os.urandom(16)).decode("ascii")
    digest = _hash_with_salt(secret, salt)
    return f"{_HASH_ALGORITHM}${_ITERATIONS}${salt}${digest}"


def verify_secret(secret: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt, expected = stored_hash.split("$", 3)
    except ValueError:
        return False
    if algorithm != _HASH_ALGORITHM or int(iterations) != _ITERATIONS:
        return False
    return hmac.compare_digest(_hash_with_salt(secret, salt), expected)


def _hash_with_salt(secret: str, salt: str) -> str:
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        secret.encode("utf-8"),
        salt.encode("utf-8"),
        _ITERATIONS,
    )
    return base64.urlsafe_b64encode(digest).decode("ascii")


def create_access_token(user_id: str) -> tuple[str, int]:
    settings = get_settings()
    now = utc_now()
    expires_at = now + timedelta(seconds=settings.jwt_expires_seconds)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, settings.jwt_expires_seconds


def decode_access_token(token: str) -> str:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.PyJWTError as exc:
        raise ApiError(
            "UNAUTHORIZED",
            "请重新进入应用。",
            status.HTTP_401_UNAUTHORIZED,
        ) from exc

    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise ApiError("UNAUTHORIZED", "请重新进入应用。", status.HTTP_401_UNAUTHORIZED)
    return user_id
