from pydantic import BaseModel


class AIDescriptionRequest(BaseModel):
    description: str | None = None