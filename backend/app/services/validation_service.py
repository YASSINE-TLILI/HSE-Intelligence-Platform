# app/services/validation_service.py

from app.core.constants import PENDING_STATUSES_BY_LEVEL
from app.repositories.incident_repository import IncidentRepository
from app.repositories.validation_repository import ValidationRepository

_validation_repo = ValidationRepository()
_incident_repo   = IncidentRepository()


class ValidationService:

    def save_validation(
        self,
        incident_id: int,
        level: str,
        status: str,
        description: str | None,
        validated_by: int | None,
    ) -> None:
        _validation_repo.create(incident_id, level, status, description, validated_by)

    def get_incident_validations(self, incident_id: int) -> list[dict]:
        return _validation_repo.find_by_incident(incident_id)

    def get_pending_validations(self, level: str, user: dict) -> list[dict]:
        """Retourne les incidents en attente de validation pour un niveau donné."""
        level = (level or "SECTEUR").upper()

        # Import ici pour éviter la dépendance circulaire
        from app.services.incident_service import IncidentService
        _incident_service = IncidentService()

        statuses = PENDING_STATUSES_BY_LEVEL.get(level, ["en attente"])
        where_scope, params_scope = _incident_service._build_scope_filter(user)
        return _incident_repo.find_in_scope_by_statuses(statuses, where_scope, params_scope)