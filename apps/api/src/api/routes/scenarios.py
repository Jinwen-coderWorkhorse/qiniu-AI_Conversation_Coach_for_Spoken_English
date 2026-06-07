from typing import Annotated

from fastapi import APIRouter, Depends

from src.api.deps import DbSession, get_current_user
from src.domain.models.user import User
from src.domain.services.scenario_service import ScenarioService
from src.schemas.scenario import ScenarioDetailResponse, ScenarioListResponse

router = APIRouter(prefix="/scenarios", tags=["Scenario"])


@router.get("", response_model=ScenarioListResponse)
def list_scenarios(
    db: DbSession,
    _current_user: Annotated[User, Depends(get_current_user)],
) -> ScenarioListResponse:
    return ScenarioService(db).list_scenarios()


@router.get("/{slug}", response_model=ScenarioDetailResponse)
def get_scenario(
    slug: str,
    db: DbSession,
    _current_user: Annotated[User, Depends(get_current_user)],
) -> ScenarioDetailResponse:
    return ScenarioService(db).get_scenario(slug)
