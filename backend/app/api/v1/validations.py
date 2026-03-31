from fastapi import APIRouter, Depends, Query

from app.core.constants import VALIDATION_LEVELS, VALIDATION_ROLE_BY_LEVEL
from app.core.deps import get_current_user, require_roles
from app.schemas.incidents import ValidationDecisionRequest
from app.services.incident_service import IncidentService
from app.services.notification_service import NotificationService
from app.services.validation_service import ValidationService
from app.services.workflow_service import WorkflowService

router = APIRouter()
_workflow = WorkflowService()
_validation_service = ValidationService()
_incident_service = IncidentService()
_notif_service = NotificationService()


@router.post("/incidents/{incident_id}/validate-sector")
def validate_sector(
    incident_id: int,
    payload: ValidationDecisionRequest,
    user=Depends(require_roles(*VALIDATION_ROLE_BY_LEVEL["SECTEUR"])),
):
    _incident_service.ensure_in_scope(user, incident_id)
    result = _workflow.validate_incident(incident_id, VALIDATION_LEVELS["SECTEUR"], "VALIDE_SECTEUR", "VALIDE", payload.comment, int(user["id"]))
    _notif_service.create_for_roles(
        message=f"Incident #{incident_id} validé par le secteur.",
        notification_type="CHANGEMENT_STATUT",
        roles=["RESPONSABLE_ZONE", "ADMINISTRATEUR"],
        incident_id=incident_id,
    )
    return result


@router.post("/incidents/{incident_id}/reject-sector")
def reject_sector(
    incident_id: int,
    payload: ValidationDecisionRequest,
    user=Depends(require_roles(*VALIDATION_ROLE_BY_LEVEL["SECTEUR"])),
):
    _incident_service.ensure_in_scope(user, incident_id)
    result = _workflow.validate_incident(incident_id, VALIDATION_LEVELS["SECTEUR"], "REJETE", "REJETE", payload.comment, int(user["id"]))
    _notif_service.create(
        message=f"Incident #{incident_id} rejeté au niveau secteur.",
        notification_type="CHANGEMENT_STATUT",
        recipient_ids=[int(user["id"])],
        incident_id=incident_id,
    )
    return result


@router.post("/incidents/{incident_id}/validate-zone")
def validate_zone(
    incident_id: int,
    payload: ValidationDecisionRequest,
    user=Depends(require_roles(*VALIDATION_ROLE_BY_LEVEL["ZONE"])),
):
    _incident_service.ensure_in_scope(user, incident_id)
    result = _workflow.validate_incident(incident_id, VALIDATION_LEVELS["ZONE"], "VALIDE_ZONE", "VALIDE", payload.comment, int(user["id"]))
    _notif_service.create_for_roles(
        message=f"Incident #{incident_id} validé au niveau zone.",
        notification_type="CHANGEMENT_STATUT",
        roles=["RESPONSABLE_HSE", "ADMINISTRATEUR"],
        incident_id=incident_id,
    )
    return result


@router.post("/incidents/{incident_id}/reject-zone")
def reject_zone(
    incident_id: int,
    payload: ValidationDecisionRequest,
    user=Depends(require_roles(*VALIDATION_ROLE_BY_LEVEL["ZONE"])),
):
    _incident_service.ensure_in_scope(user, incident_id)
    return _workflow.validate_incident(incident_id, VALIDATION_LEVELS["ZONE"], "REJETE", "REJETE", payload.comment, int(user["id"]))


@router.post("/incidents/{incident_id}/validate-hse")
def validate_hse(
    incident_id: int,
    payload: ValidationDecisionRequest,
    user=Depends(require_roles(*VALIDATION_ROLE_BY_LEVEL["HSE"])),
):
    _incident_service.ensure_in_scope(user, incident_id)
    result = _workflow.validate_incident(incident_id, VALIDATION_LEVELS["HSE"], "VALIDE_HSE", "VALIDE", payload.comment, int(user["id"]))
    _notif_service.create_for_roles(
        message=f"Incident #{incident_id} validé par HSE.",
        notification_type="CHANGEMENT_STATUT",
        roles=["RESPONSABLE_SECTEUR", "RESPONSABLE_ZONE", "ADMINISTRATEUR"],
        incident_id=incident_id,
    )
    return result


@router.post("/incidents/{incident_id}/reject-hse")
def reject_hse(
    incident_id: int,
    payload: ValidationDecisionRequest,
    user=Depends(require_roles(*VALIDATION_ROLE_BY_LEVEL["HSE"])),
):
    _incident_service.ensure_in_scope(user, incident_id)
    return _workflow.validate_incident(incident_id, VALIDATION_LEVELS["HSE"], "REJETE", "REJETE", payload.comment, int(user["id"]))


@router.get("/incidents/{incident_id}/validations")
def incident_validations(incident_id: int, _user=Depends(get_current_user)):
    _incident_service.ensure_in_scope(_user, incident_id)
    return _validation_service.get_incident_validations(incident_id)


@router.get("/validations/pending")
def pending_validations(level: str = Query(""), _user=Depends(get_current_user)):
    return _validation_service.get_pending_validations(level, _user)