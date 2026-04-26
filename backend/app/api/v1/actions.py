# app/api/v1/actions.py
#
# Règle métier : seul le RESPONSABLE_SECTEUR (et l'ADMINISTRATEUR) peut créer une action corrective.
# L'id_incident est récupéré automatiquement depuis le path, jamais saisi à la main.

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_user, require_roles
from app.schemas.actions import ActionCloseRequest, ActionCreateRequest
from app.services.action_service import ActionService
from app.services.incident_service import IncidentService

router = APIRouter()
_service          = ActionService()
_incident_service = IncidentService()


@router.post("/incidents/{incident_id}/actions", status_code=201)
def create_incident_action(
    incident_id: int,
    payload: ActionCreateRequest,
    user=Depends(require_roles("RESPONSABLE_SECTEUR", "ADMINISTRATEUR")),
):
    """Crée une action corrective pour l'incident donné.
    - id_incident résolu automatiquement via le path (jamais saisi à la main).
    - Le responsable connecté est automatiquement assigné si idResponsableSecteur est absent.
    - Réservé au RESPONSABLE_SECTEUR et à l'ADMINISTRATEUR.
    """
    if not payload.description or not payload.dateDebut or not payload.dateFinPrevue:
        raise HTTPException(
            status_code=400,
            detail="Les champs description, dateDebut et dateFinPrevue sont obligatoires.",
        )

    # Vérifier que l'incident est dans le périmètre du responsable
    _incident_service.ensure_in_scope(user, incident_id)

    return _service.create_action(
        incident_id=incident_id,
        description=payload.description,
        date_debut=payload.dateDebut,
        date_fin_prevue=payload.dateFinPrevue,
        responsible_id=payload.idResponsableSecteur or int(user["id"]),
    )


@router.get("/incidents/{incident_id}/actions")
def list_incident_actions(incident_id: int, user=Depends(get_current_user)):
    """Liste toutes les actions correctives d'un incident."""
    _incident_service.ensure_in_scope(user, incident_id)
    return _service.list_for_incident(incident_id)


@router.get("/actions/{action_id}")
def read_action(action_id: int, _user=Depends(get_current_user)):
    return _service.get_action(action_id)


@router.patch("/actions/{action_id}/validate")
def validate_action_endpoint(
    action_id: int,
    _user=Depends(require_roles("RESPONSABLE_SECTEUR", "RESPONSABLE_ZONE", "RESPONSABLE_ENTITE", "ADMINISTRATEUR")),
):
    return _service.validate_action(action_id)


@router.patch("/actions/{action_id}/close")
def close_action_endpoint(
    action_id: int,
    payload: ActionCloseRequest,
    _user=Depends(require_roles("RESPONSABLE_SECTEUR", "RESPONSABLE_ZONE", "RESPONSABLE_ENTITE", "ADMINISTRATEUR")),
):
    return _service.close_action(action_id, payload.preuvePhoto)