from typing import Any

from app.core.database import db_cursor, fetch_all


class NotificationRepository:
    """Accès aux données pour la table notification."""

    def create_bulk(self, message: str, notification_type: str, recipient_ids: list[int], incident_id: int | None) -> None:
        if not recipient_ids:
            return
        with db_cursor() as (_conn, cursor):
            for user_id in recipient_ids:
                cursor.execute(
                    "INSERT INTO notification (message, type, id_destinataire, id_incident) VALUES (%s, %s, %s, %s)",
                    (message, notification_type, user_id, incident_id),
                )

    def find_by_user(self, user_id: int) -> list[dict[str, Any]]:
        return fetch_all(
            """
            SELECT id_notification, message, type, date_envoi, statut_lecture, id_incident
            FROM notification WHERE id_destinataire = %s ORDER BY date_envoi DESC
            """,
            (user_id,),
        )

    def mark_read(self, notification_id: int, user_id: int) -> int:
        with db_cursor() as (_conn, cursor):
            affected = cursor.execute(
                """
                UPDATE notification SET statut_lecture = 'LU'
                WHERE id_notification = %s AND id_destinataire = %s
                """,
                (notification_id, user_id),
            )
            return int(affected)

    def mark_all_read(self, user_id: int) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "UPDATE notification SET statut_lecture = 'LU' WHERE id_destinataire = %s AND statut_lecture = 'NON_LU'",
                (user_id,),
            )