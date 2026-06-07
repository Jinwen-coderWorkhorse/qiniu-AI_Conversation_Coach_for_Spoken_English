from pydantic import BaseModel, Field


class AnonymousAuthRequest(BaseModel):
    anonymous_id: str = Field(min_length=1, max_length=64)
    anonymous_secret: str = Field(min_length=1)


class UserIdentity(BaseModel):
    id: str
    anonymous_id: str


class AnonymousAuthResponse(BaseModel):
    user: UserIdentity
    access_token: str
    expires_in: int
