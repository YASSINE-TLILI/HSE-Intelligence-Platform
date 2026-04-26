from pydantic import BaseModel
from typing import Literal


class NotificationCreate(BaseModel):
    message: str
    type: Literal[
        "NOUVEL_INCIDENT",
        "CHANGEMENT_STATUT",
        "ESCALADE",
        "ACTION_CORRECTIVE",
        "RAPPORT_DISPONIBLE",
        "AUDIT_PLANIFIE"
    ]
    id_incident: int | None = None
    id_destinataire: int


class NotificationResponse(BaseModel):
    id_notification: int
    message: str
    type: str
    statut_lecture: str
    date_envoi: str