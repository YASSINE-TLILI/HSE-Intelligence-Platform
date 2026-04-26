from app.core.constants import WORKFLOW_TRANSITIONS
from app.core.exceptions import ForbiddenError, ValidationError
from app.repositories.incident_repository import IncidentRepository
from app.repositories.validation_repository import ValidationRepository
from app.services.validation_service import ValidationService

_incident_repo   = IncidentRepository()
_validation_repo = ValidationRepository()
_validation_svc  = ValidationService()


class WorkflowService:

    def validate_incident(
        self,
        incident_id: int,
        level: str,
        validation_status: str,      # Statut pour la table validation (ex: "VALIDE_SECTEUR")
        incident_new_status: str,    # Statut pour la table incident (ex: "EN_ATTENTE_VALIDATION_ZONE")
        comment: str | None,
        validated_by: int,
    ) -> dict:
        """
        Applique une décision de validation à un incident.

        Workflow complet :
          En attente
            → SECTEUR valide  → validation_status="VALIDE_SECTEUR", incident_new_status="EN_ATTENTE_VALIDATION_ZONE"
            → ZONE    valide  → validation_status="VALIDE_ZONE",    incident_new_status="EN_ATTENTE_VALIDATION_ENTITE"
            → ENTITE  valide  → validation_status="VALIDE_ENTITE",  incident_new_status="CLOTURE"
          Rejet → validation_status="REJETE", incident_new_status="REJETE"
        """
        level = level.upper()

        # Vérifier que l'incident existe
        incident = _incident_repo.find_by_id(incident_id)
        if not incident:
            raise ValidationError("Incident introuvable.")

        # Enregistrer la décision dans la table validation
        _validation_svc.save_validation(
            incident_id=incident_id,
            level=level,
            status=validation_status,
            description=comment,
            validated_by=validated_by,
        )

        # Mettre à jour le statut de l'incident
        _incident_repo.update_status(incident_id, incident_new_status)

        return {
            "incident_id":  incident_id,
            "level":        level,
            "decision":     validation_status,
            "new_status":   incident_new_status,
            "comment":      comment,
            "validated_by": validated_by,
        }