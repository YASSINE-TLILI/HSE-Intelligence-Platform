from app.repositories.incident_repository import IncidentRepository
from app.repositories.validation_repository import ValidationRepository
from app.services.incident_service import IncidentService

_validation_repo = ValidationRepository()
_incident_repo = IncidentRepository()
_incident_service = IncidentService()


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
        level = (level or "").upper()
        statuses = ["DECLARE"]
        if level == "ZONE":
            statuses = ["VALIDE_SECTEUR", "EN_ATTENTE_VALIDATION_ZONE"]
        elif level == "HSE":
            statuses = ["VALIDE_ZONE", "EN_ATTENTE_VALIDATION_HSE"]
        elif level == "SECTEUR":
            statuses = ["DECLARE", "EN_ATTENTE_VALIDATION_SECTEUR"]

        where_scope, params_scope = _incident_service._build_scope_filter(user)
        return _incident_repo.find_in_scope_by_statuses(statuses, where_scope, params_scope)