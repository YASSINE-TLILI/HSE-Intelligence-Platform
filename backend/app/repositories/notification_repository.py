# app/repositories/notification_repository.py
from typing import Any
from app.core.database import db_cursor, fetch_all, fetch_one


class NotificationRepository:
    """Accès aux données pour la table notification."""

    def create(
        self,
        message: str,
        notification_type: str,
        user_id: int,
        incident_id: int | None = None,
    ) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                """
                INSERT INTO notification (message, type, id_destinataire, id_incident)
                VALUES (%s, %s, %s, %s)
                """,
                (message, notification_type, user_id, incident_id),
            )

    def create_bulk(
        self,
        message: str,
        notification_type: str,
        recipient_ids: list[int],
        incident_id: int | None,
    ) -> None:
        if not recipient_ids:
            return
        with db_cursor() as (_conn, cursor):
            for user_id in recipient_ids:
                cursor.execute(
                    """
                    INSERT INTO notification (message, type, id_destinataire, id_incident)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (message, notification_type, user_id, incident_id),
                )

    def find_by_user(self, user_id: int) -> list[dict[str, Any]]:
        return fetch_all(
            """
            SELECT
                n.id_notification,
                n.message,
                n.type,
                n.date_envoi,
                n.statut_lecture,
                n.id_incident,
                i.titre AS incident_titre,
                i.statut AS incident_statut,
                i.type_incident
            FROM notification n
            LEFT JOIN incident i ON i.id_incident = n.id_incident
            WHERE n.id_destinataire = %s
            ORDER BY n.date_envoi DESC
            LIMIT 100
            """,
            (user_id,),
        )

    def find_in_scope(
        self, where_sql: str, params: tuple
    ) -> list[dict[str, Any]]:
        """Retourne les notifications dans un périmètre donné (zone, entité…)."""
        return fetch_all(
            f"""
            SELECT
                n.id_notification,
                n.message,
                n.type,
                n.date_envoi,
                n.statut_lecture,
                n.id_incident,
                n.id_destinataire,
                u.nom AS dest_nom,
                u.prenom AS dest_prenom,
                u.role AS dest_role,
                i.titre AS incident_titre,
                i.statut AS incident_statut,
                i.type_incident
            FROM notification n
            LEFT JOIN utilisateur u ON u.id = n.id_destinataire
            LEFT JOIN incident i ON i.id_incident = n.id_incident
            WHERE {where_sql}
            ORDER BY n.date_envoi DESC
            LIMIT 200
            """,
            params,
        )

    def mark_as_read(self, notification_id: int) -> None:
        """Marque une notification comme lue (sans contrôle utilisateur)."""
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "UPDATE notification SET statut_lecture = 'LU' WHERE id_notification = %s",
                (notification_id,),
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
                """
                UPDATE notification SET statut_lecture = 'LU'
                WHERE id_destinataire = %s AND statut_lecture = 'NON_LU'
                """,
                (user_id,),
            )

    def count_unread(self, user_id: int) -> int:
        row = fetch_one(
            "SELECT COUNT(*) AS c FROM notification WHERE id_destinataire = %s AND statut_lecture = 'NON_LU'",
            (user_id,),
        )
        return int((row or {}).get("c") or 0)