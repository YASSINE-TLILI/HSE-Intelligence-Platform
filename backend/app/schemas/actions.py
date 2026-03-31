from pydantic import BaseModel


class ActionCreateRequest(BaseModel):
    description: str
    dateDebut: str
    dateFinPrevue: str
    idResponsableSecteur: int | None = None


class ActionCloseRequest(BaseModel):
    preuvePhoto: str | None = None