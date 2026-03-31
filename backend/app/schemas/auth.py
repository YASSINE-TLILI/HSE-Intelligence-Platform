from pydantic import BaseModel


class RegisterRequest(BaseModel):
    nom: str
    prenom: str
    personalEmail: str
    telephone: str
    adresse: str
    dateNaissance: str | None = None
    mot_passe: str
    confirm_mot_passe: str
    role: str
    id_secteur: int | None = None
    id_zone: int | None = None
    id_entite: int | None = None
    id_site: int | None = None

class AdminReviewDecisionRequest(BaseModel):
    token: str
    action: str
    role: str | None = None
    companyEmail: str | None = None
    note: str | None = None


class SetupPasswordRequest(BaseModel):
    token: str
    pin: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateMeRequest(BaseModel):
    nom: str | None = None
    prenom: str | None = None
    email: str | None = None