# app/api/v1/validations.py
#
# Règles métier :
#   RESPONSABLE_SECTEUR → valide ET rejette → après validation : action corrective obligatoire
#   RESPONSABLE_ZONE    → valide SEULEMENT
#   RESPONSABLE_ENTITE  → valide SEULEMENT → clôture le workflow

from fastapi import APIRouter, Depends, Query

from app.core.constants import VALIDATION_LEVELS, VALIDATION_ROLE_BY_LEVEL
from app.core.deps import get_current_user, require_roles
from app.repositories.incident_repository import IncidentRepository
from app.schemas.incidents import ValidationDecisionRequest
from app.services.incident_service import IncidentService
from app.services.notification_service import NotificationService
from app.services.validation_service import ValidationService
from app.services.workflow_service import WorkflowService

router = APIRouter()
_workflow           = WorkflowService()
_validation_service = ValidationService()
_incident_service   = IncidentService()
_notif_service      = NotificationService()
_incident_repo      = IncidentRepository()


# ─── SECTEUR ─────────────────────────────────────────────────────────────────

@router.post("/incidents/{incident_id}/validate-sector")
def validate_sector(
    incident_id: int,
    payload: ValidationDecisionRequest,
    user=Depends(require_roles(*VALIDATION_ROLE_BY_LEVEL["SECTEUR"])),
):
    """Valide au niveau secteur → passe à EN_ATTENTE_VALIDATION_ZONE.
    Déclenche une notification email au responsable zone."""
    _incident_service.ensure_in_scope(user, incident_id)

    result = _workflow.validate_incident(
        incident_id=incident_id,
        level=VALIDATION_LEVELS["SECTEUR"],
        validation_status="VALIDE_SECTEUR",
        incident_new_status="EN_ATTENTE_VALIDATION_ZONE",
        comment=payload.comment,
        validated_by=int(user["id"]),
    )

    # Notification in-app pour les admins
    _notif_service.create_for_roles(
        message=f"Incident #{incident_id} validé secteur — en attente validation zone.",
        notification_type="CHANGEMENT_STATUT",
        roles=["ADMINISTRATEUR"],
        incident_id=incident_id,
    )

    # Email + notification in-app au responsable zone
    try:
        _notif_service.notify_responsable_zone(incident_id)
    except Exception as exc:
        print(f"[NOTIF] notify_responsable_zone: {exc}")

    return result


@router.post("/incidents/{incident_id}/reject-sector")
def reject_sector(
    incident_id: int,
    payload: ValidationDecisionRequest,
    user=Depends(require_roles(*VALIDATION_ROLE_BY_LEVEL["SECTEUR"])),
):
    """Rejette au niveau secteur → type_incident = anomalie, statut = REJETE."""
    _incident_service.ensure_in_scope(user, incident_id)

    result = _workflow.validate_incident(
        incident_id=incident_id,
        level=VALIDATION_LEVELS["SECTEUR"],
        validation_status="REJETE",
        incident_new_status="REJETE",
        comment=payload.comment,
        validated_by=int(user["id"]),
    )

    # Reclassifier en anomalie
    _incident_repo.update_type_incident(incident_id, "anomalie")

    # Notification email + in-app au déclarant
    try:
        _notif_service.notify_rejection(incident_id)
    except Exception as exc:
        print(f"[NOTIF] notify_rejection: {exc}")

    _notif_service.create_for_roles(
        message=f"Incident #{incident_id} rejeté — reclassifié comme anomalie.",
        notification_type="CHANGEMENT_STATUT",
        roles=["ADMINISTRATEUR"],
        incident_id=incident_id,
    )

    return result


# ─── ZONE ────────────────────────────────────────────────────────────────────

@router.post("/incidents/{incident_id}/validate-zone")
def validate_zone(
    incident_id: int,
    payload: ValidationDecisionRequest,
    user=Depends(require_roles(*VALIDATION_ROLE_BY_LEVEL["ZONE"])),
):
    """Valide au niveau zone → EN_ATTENTE_VALIDATION_ENTITE.
    Déclenche une notification email au responsable entité."""
    _incident_service.ensure_in_scope(user, incident_id)

    result = _workflow.validate_incident(
        incident_id=incident_id,
        level=VALIDATION_LEVELS["ZONE"],
        validation_status="VALIDE_ZONE",
        incident_new_status="EN_ATTENTE_VALIDATION_ENTITE",
        comment=payload.comment,
        validated_by=int(user["id"]),
    )

    # Email + notification in-app au responsable entité
    try:
        _notif_service.notify_responsable_entite(incident_id)
    except Exception as exc:
        print(f"[NOTIF] notify_responsable_entite: {exc}")

    _notif_service.create_for_roles(
        message=f"Incident #{incident_id} validé zone — en attente validation entité.",
        notification_type="CHANGEMENT_STATUT",
        roles=["ADMINISTRATEUR"],
        incident_id=incident_id,
    )

    return result


# ─── ENTITE ──────────────────────────────────────────────────────────────────

@router.post("/incidents/{incident_id}/validate-entite")
def validate_entite(
    incident_id: int,
    payload: ValidationDecisionRequest,
    user=Depends(require_roles(*VALIDATION_ROLE_BY_LEVEL["ENTITE"])),
):
    """Valide HSE finale → CLOTURE. Notifie déclarant et responsables."""
    _incident_service.ensure_in_scope(user, incident_id)

    result = _workflow.validate_incident(
        incident_id=incident_id,
        level=VALIDATION_LEVELS["ENTITE"],
        validation_status="VALIDE_ENTITE",
        incident_new_status="CLOTURE",
        comment=payload.comment,
        validated_by=int(user["id"]),
    )

    # Notifier clôture — déclarant + responsables
    try:
        _notif_service.notify_closure(incident_id)
    except Exception as exc:
        print(f"[NOTIF] notify_closure: {exc}")

    return result


# ─── LECTURE ─────────────────────────────────────────────────────────────────

@router.get("/incidents/{incident_id}/validations")
def incident_validations(incident_id: int, _user=Depends(get_current_user)):
    _incident_service.ensure_in_scope(_user, incident_id)
    return _validation_service.get_incident_validations(incident_id)


@router.get("/validations/pending")
def pending_validations(level: str = Query("SECTEUR"), user=Depends(get_current_user)):
    return _validation_service.get_pending_validations(level, user)