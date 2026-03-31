from app.services.incident_service import IncidentService
from app.services.notification_service import NotificationService
from app.services.validation_service import ValidationService

_incident_service = IncidentService()
_validation_service = ValidationService()
_notif_service = NotificationService()


class WorkflowService:
    """Orchestre le workflow de validation d'un incident."""

    def validate_incident(
        self,
        incident_id: int,
        level: str,
        status_to_set: str,
        status_label: str,
        comment: str | None,
        validated_by: int,
    ) -> dict:
        _incident_service.update_status(incident_id, status_to_set)
        _validation_service.save_validation(
            incident_id=incident_id,
            level=level,
            status=status_label,
            description=comment or f"{status_label.title()} {level.lower()}",
            validated_by=validated_by,
        )
        return {"message": f"{status_label.title()} {level.lower()} enregistrée."}