from __future__ import annotations

from fastapi import status
from sqlalchemy.orm import Session

from src.infrastructure.repositories.scenario_repository import ScenarioRepository
from src.schemas.errors import ApiError
from src.schemas.scenario import (
    ScenarioDetailResponse,
    ScenarioListItem,
    ScenarioListResponse,
    ScenarioStepResponse,
)


class ScenarioService:
    def __init__(self, db: Session):
        self.scenarios = ScenarioRepository(db)

    def list_scenarios(self) -> ScenarioListResponse:
        items = [
            ScenarioListItem(
                slug=scenario.slug,
                name=scenario.name,
                summary=scenario.summary,
                estimated_minutes=scenario.estimated_minutes,
                steps=[step["title"] for step in scenario.steps_json],
            )
            for scenario in self.scenarios.list_active()
        ]
        return ScenarioListResponse(items=items)

    def get_scenario(self, slug: str) -> ScenarioDetailResponse:
        scenario = self.scenarios.get_by_slug(slug)
        if scenario is None:
            raise ApiError("SCENARIO_NOT_FOUND", "场景不存在。", status.HTTP_404_NOT_FOUND)

        return ScenarioDetailResponse(
            slug=scenario.slug,
            name=scenario.name,
            summary=scenario.summary,
            estimated_minutes=scenario.estimated_minutes,
            steps=[
                ScenarioStepResponse(step_no=step["step_no"], title=step["title"])
                for step in scenario.steps_json
            ],
        )
