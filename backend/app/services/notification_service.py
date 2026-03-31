from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository

_notif_repo = NotificationRepository()
_user_repo = UserRepository()


class NotificationService:

    def create(
        self,
        message: str,
        notification_type: str,
        recipient_ids: list[int],
        incident_id: int | None = None,
    ) -> None:
        _notif_repo.create_bulk(message, notification_type, recipient_ids, incident_id)

    def create_for_roles(
        self,
        message: str,
        notification_type: str,
        roles: list[str],
        incident_id: int | None = None,
    ) -> None:
        rows = _user_repo.find_by_roles(roles)
        recipient_ids = [int(row["id"]) for row in rows]
        self.create(message, notification_type, recipient_ids, incident_id)

    def get_for_user(self, user_id: int) -> list[dict]:
        return _notif_repo.find_by_user(user_id)

    def mark_read(self, notification_id: int, user_id: int) -> int:
        return _notif_repo.mark_read(notification_id, user_id)

    def mark_all_read(self, user_id: int) -> None:
        _notif_repo.mark_all_read(user_id)