from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ─── Entite ────────────────────────────────────────────────────────────────────

class EntiteBase(BaseModel):
    nom_entite: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    id_site: int
    id_responsable_entite: Optional[int] = None


class EntiteCreate(EntiteBase):
    pass


class EntiteUpdate(BaseModel):
    nom_entite: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    id_site: Optional[int] = None
    id_responsable_entite: Optional[int] = None


class EntiteResponsable(BaseModel):
    id: int
    nom: str
    prenom: str
    email: str

    class Config:
        from_attributes = True


class EntiteResponse(BaseModel):
    id_entite: int
    nom_entite: str
    description: Optional[str] = None
    id_site: int
    id_responsable_entite: Optional[int] = None
    responsable: Optional[EntiteResponsable] = None
    nb_zones: Optional[int] = 0

    class Config:
        from_attributes = True


class EntiteListResponse(BaseModel):
    items: list[EntiteResponse]
    total: int


# ─── Zone ──────────────────────────────────────────────────────────────────────

class ZoneBase(BaseModel):
    nom_zone: str = Field(..., min_length=1, max_length=150)
    safety_score: Optional[float] = Field(None, ge=0, le=100)
    id_entite: int
    id_responsable_zone: Optional[int] = None


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    nom_zone: Optional[str] = Field(None, min_length=1, max_length=150)
    safety_score: Optional[float] = Field(None, ge=0, le=100)
    id_entite: Optional[int] = None
    id_responsable_zone: Optional[int] = None


class ZoneResponsable(BaseModel):
    id: int
    nom: str
    prenom: str
    email: str

    class Config:
        from_attributes = True


class ZoneResponse(BaseModel):
    id_zone: int
    nom_zone: str
    safety_score: Optional[float] = None
    id_entite: int
    id_responsable_zone: Optional[int] = None
    responsable: Optional[ZoneResponsable] = None
    entite_nom: Optional[str] = None
    nb_secteurs: Optional[int] = 0

    class Config:
        from_attributes = True


class ZoneListResponse(BaseModel):
    items: list[ZoneResponse]
    total: int


# ─── Secteur ───────────────────────────────────────────────────────────────────

class SecteurBase(BaseModel):
    nom_secteur: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    id_zone: int
    id_responsable_secteur: Optional[int] = None


class SecteurCreate(SecteurBase):
    pass


class SecteurUpdate(BaseModel):
    nom_secteur: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    id_zone: Optional[int] = None
    id_responsable_secteur: Optional[int] = None


class SecteurResponsable(BaseModel):
    id: int
    nom: str
    prenom: str
    email: str

    class Config:
        from_attributes = True


class SecteurResponse(BaseModel):
    id_secteur: int
    nom_secteur: str
    description: Optional[str] = None
    id_zone: int
    id_responsable_secteur: Optional[int] = None
    responsable: Optional[SecteurResponsable] = None
    zone_nom: Optional[str] = None
    entite_nom: Optional[str] = None

    class Config:
        from_attributes = True


class SecteurListResponse(BaseModel):
    items: list[SecteurResponse]
    total: int