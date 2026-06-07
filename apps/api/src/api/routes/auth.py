from fastapi import APIRouter

from src.api.deps import DbSession
from src.domain.services.auth_service import AuthService
from src.schemas.auth import AnonymousAuthRequest, AnonymousAuthResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/anonymous", response_model=AnonymousAuthResponse)
def create_or_restore_anonymous_user(
    payload: AnonymousAuthRequest,
    db: DbSession,
) -> AnonymousAuthResponse:
    return AuthService(db).create_or_restore(
        anonymous_id=payload.anonymous_id,
        anonymous_secret=payload.anonymous_secret,
    )
