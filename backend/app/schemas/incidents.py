from pydantic import BaseModel


class IncidentCreateRequest(BaseModel):
    title: str
    description: str
    priority: str
    zone: str | None = None
    entiteId: int | None = None
    secteurId: int | None = None
    lat: float | None = None
    lng: float | None = None
    photoUrl: str | None = None


class IncidentUpdateRequest(BaseModel):
    title: str
    description: str
    priority: str
    zone: str | None = None
    entiteId: int | None = None
    secteurId: int | None = None
    status: str | None = None
    lat: float | None = None
    lng: float | None = None
    photoUrl: str | None = None


class ValidationDecisionRequest(BaseModel):
    comment: str | None = None