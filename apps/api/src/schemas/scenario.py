from pydantic import BaseModel


class ScenarioListItem(BaseModel):
    slug: str
    name: str
    summary: str
    estimated_minutes: int
    steps: list[str]


class ScenarioListResponse(BaseModel):
    items: list[ScenarioListItem]


class ScenarioStepResponse(BaseModel):
    step_no: int
    title: str


class ScenarioDetailResponse(BaseModel):
    slug: str
    name: str
    summary: str
    estimated_minutes: int
    steps: list[ScenarioStepResponse]
