from pydantic import BaseModel

class ValidationRequest(BaseModel):
    decision: str  # "VALIDER" ou "REJETER"
    comment: str | None = None