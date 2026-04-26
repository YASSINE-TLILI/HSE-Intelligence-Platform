from pydantic import BaseModel, Field
from typing import Optional

class EntrepriseBase(BaseModel):
    nom_entreprise: str = Field(..., min_length=1, max_length=150)
    email: str
    telephone: str
    adresse: str