from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.models.scenario import Scenario


class ScenarioRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_active(self) -> list[Scenario]:
        stmt = (
            select(Scenario)
            .where(Scenario.deleted_at.is_(None))
            .order_by(Scenario.sort_order.asc())
        )
        return list(self.db.scalars(stmt).all())

    def get_by_slug(self, slug: str) -> Scenario | None:
        stmt = select(Scenario).where(
            Scenario.slug == slug,
            Scenario.deleted_at.is_(None),
        )
        return self.db.scalar(stmt)

    def upsert(self, scenario_data: dict) -> Scenario:
        scenario = self.db.get(Scenario, scenario_data["slug"])
        if scenario is None:
            scenario = Scenario(**scenario_data)
            self.db.add(scenario)
            return scenario

        for key, value in scenario_data.items():
            setattr(scenario, key, value)
        scenario.deleted_at = None
        return scenario
