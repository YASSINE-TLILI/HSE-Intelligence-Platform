from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_user, require_roles
from app.schemas.actions import ActionCloseRequest, ActionCreateRequest
from app.services.action_service import ActionService

router = APIRouter()
_service = ActionService()


@router.post("/incidents/{incident_id}/actions", status_code=201)
def create_incident_action(
    incident_id: int,
    payload: ActionCreateRequest,
    user=Depends(require_roles("RESPONSABLE_SECTEUR", "ADMINISTRATEUR")),
):
    if not payload.description or not payload.dateDebut or not payload.dateFinPrevue:
        raise HTTPException(status_code=400, detail="description, dateDebut et dateFinPrevue sont requis.")
    return _service.create_action(
        incident_id=incident_id,
        description=payload.description,
        date_debut=payload.dateDebut,
        date_fin_prevue=payload.dateFinPrevue,
        responsible_id=payload.idResponsableSecteur or int(user["id"]),
    )


@router.get("/actions/{action_id}")
def read_action(action_id: int, _user=Depends(get_current_user)):
    return _service.get_action(action_id)


@router.patch("/actions/{action_id}/validate")
def validate_action_endpoint(
    action_id: int,
    _user=Depends(require_roles("RESPONSABLE_SECTEUR", "RESPONSABLE_ZONE", "RESPONSABLE_HSE", "ADMINISTRATEUR")),
):
    return _service.validate_action(action_id)


@router.patch("/actions/{action_id}/close")
def close_action_endpoint(
    action_id: int,
    payload: ActionCloseRequest,
    _user=Depends(require_roles("RESPONSABLE_SECTEUR", "RESPONSABLE_ZONE", "RESPONSABLE_HSE", "ADMINISTRATEUR")),
):
    return _service.close_action(action_id, payload.preuvePhoto)