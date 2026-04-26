from pydantic import BaseModel, Field

class User(BaseModel):
    id: int
    nom: str
    prenom: str
    email: str
    role: str
    telephone: str | None = None
    adresse: str | None = None
    dateNaissance: str | None = None
    id_secteur: int | None = None
    id_zone: int | None = None
    id_entite: int | None = None
    id_site: int | None = None
class UserCreateRequest(BaseModel):
    nom: str
    prenom: str
    email: str
    role: str
    telephone: str | None = None
    adresse: str | None = None
    dateNaissance: str | None = None
    id_secteur: int | None = None
    id_zone: int | None = None
    id_entite: int | None = None
    id_site: int | None = None
    id_entreprise: int | None = None
    
class UserUpdateRequest(BaseModel):
    nom: str | None = None
    prenom: str | None = None
    email: str | None = None
    role: str | None = None
    telephone: str | None = None
    adresse: str | None = None
    dateNaissance: str | None = None
    id_entreprise: int | None = None
    idZone: int | None = Field(None, alias="id_zone")
    idEntite: int | None = Field(None, alias="id_entite")
    idSite: int | None = Field(None, alias="id_site")
    idSecteur: int | None = Field(None, alias="id_secteur")
    nomZone: str | None = Field(None, alias="nomZone")
    nomEntite: str | None = Field(None, alias="nomEntite")
    nomSecteur: str | None = Field(None, alias="nomSecteur")


    class Config:
        populate_by_name = True