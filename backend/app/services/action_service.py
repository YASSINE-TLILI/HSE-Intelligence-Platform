from app.core.exceptions import NotFoundError
from app.repositories.action_repository import ActionRepository
from app.services.notification_service import NotificationService

_action_repo = ActionRepository()
_notif_service = NotificationService()


class ActionService:

    def create_action(
        self,
        incident_id: int,
        description: str,
        date_debut: str,
        date_fin_prevue: str,
        responsible_id: int,
    ) -> dict:
        action_id = _action_repo.create(incident_id, description, date_debut, date_fin_prevue, responsible_id)
        _notif_service.create_for_roles(
            message=f"Action corrective #{action_id} créée pour incident #{incident_id}.",
            notification_type="ACTION_CORRECTIVE",
            roles=["RESPONSABLE_SECTEUR", "ADMINISTRATEUR"],
            incident_id=incident_id,
        )
        return {"idAction": action_id, "message": "Action corrective créée."}

    def get_action(self, action_id: int) -> dict:
        row = _action_repo.find_by_id(action_id)
        if not row:
            raise NotFoundError("Action corrective introuvable.")
        return row

    def validate_action(self, action_id: int) -> dict:
        _action_repo.validate(action_id)
        return {"message": "Action corrective validée."}

    def close_action(self, action_id: int, preuve_photo: str | None) -> dict:
        _action_repo.close(action_id, preuve_photo)
        return {"message": "Action corrective clôturée."}