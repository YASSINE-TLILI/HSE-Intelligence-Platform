
from pydantic import BaseModel
from typing import Literal


class IncidentCreateRequest(BaseModel):
    description: str
    priority: str
    type_incident: Literal["incident", "anomalie"] = "incident"
    zone: str | None = None
    entiteId: int | None = None
    secteurId: int | None = None
    lat: float | None = None
    lng: float | None = None
    photoUrl: str | None = None


class IncidentUpdateRequest(BaseModel):
    description: str
    priority: str
    type_incident: Literal["incident", "anomalie"] = "incident"
    zone: str | None = None
    entiteId: int | None = None
    secteurId: int | None = None
    status: str | None = None
    lat: float | None = None
    lng: float | None = None
    photoUrl: str | None = None


class ValidationDecisionRequest(BaseModel):
    comment: str | None = None